param(
  [string[]]$Routes = @()
)

if (-not $Routes.Length -and $args.Length) {
  $Routes = $args
}

if (-not $Routes.Length) {
  throw 'Please pass one or more admin routes.'
}

$ErrorActionPreference = 'Stop'

$targets = Invoke-RestMethod -Uri 'http://127.0.0.1:9777/json/list'
$target = $targets | Where-Object { $_.url -like '*localhost:5173/admin*' } | Select-Object -First 1
if (-not $target) {
  throw 'No admin tab found on Chrome remote debugging port 9777.'
}

$wsUrl = [Uri]$target.webSocketDebuggerUrl
$ws = [System.Net.WebSockets.ClientWebSocket]::new()
$ct = [Threading.CancellationToken]::None
$ws.ConnectAsync($wsUrl, $ct).GetAwaiter().GetResult()

$script:nextId = 0
function Send-Cdp {
  param([string]$Method, [object]$Params = $null)
  $script:nextId += 1
  $payload = @{ id = $script:nextId; method = $Method }
  if ($null -ne $Params) { $payload.params = $Params }
  $json = $payload | ConvertTo-Json -Depth 30 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $segment = [ArraySegment[byte]]::new($bytes)
  $script:ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $script:ct).GetAwaiter().GetResult()
  while ($true) {
    $chunks = New-Object System.Collections.Generic.List[string]
    do {
      $buffer = New-Object byte[] 1048576
      $output = [ArraySegment[byte]]::new($buffer)
      $result = $script:ws.ReceiveAsync($output, $script:ct).GetAwaiter().GetResult()
      $chunks.Add([Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count))
    } while (-not $result.EndOfMessage)
    $text = [string]::Join('', $chunks)
    if (-not $text) { continue }
    try {
      $message = $text | ConvertFrom-Json
    } catch {
      continue
    }
    if ($message.id -eq $script:nextId) { return $message }
  }
}

function Eval-Js {
  param([string]$Expression)
  $response = Send-Cdp 'Runtime.evaluate' @{
    expression = $Expression
    returnByValue = $true
    awaitPromise = $true
  }
  return $response.result.result.value
}

Send-Cdp 'Runtime.enable' | Out-Null

$outputs = @()
foreach ($route in $Routes) {
  $url = "http://localhost:5173/admin/#$route"
  Send-Cdp 'Page.navigate' @{ url = $url } | Out-Null
  Start-Sleep -Seconds 3
  $expression = @'
(() => {
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()
  const text = document.body.innerText.replace(/\n{3,}/g, '\n\n').slice(0, 5000)
  const buttons = [...document.querySelectorAll('button, uni-button')]
    .map((el) => clean(el.innerText || el.textContent))
    .filter(Boolean)
    .slice(0, 80)
  const inputs = [...document.querySelectorAll('input, textarea')]
    .map((el) => ({ type: el.type || el.tagName, placeholder: el.placeholder || '', valueLen: (el.value || '').length }))
    .slice(0, 50)
  const errors = [...document.querySelectorAll('.uni-error-message, .error, [class*=error]')]
    .map((el) => clean(el.innerText || el.textContent))
    .filter(Boolean)
    .slice(0, 20)
  return { title: document.title, url: location.href, text, buttons, inputs, errors }
})()
'@
  $value = Eval-Js $expression
  $outputs += [pscustomobject]@{
    route = $route
    url = $value.url
    text = $value.text
    buttons = $value.buttons
    inputs = $value.inputs
    errors = $value.errors
  }
}

$outputs | ConvertTo-Json -Depth 10
$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', $ct).GetAwaiter().GetResult()
