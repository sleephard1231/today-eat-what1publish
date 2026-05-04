param(
  [Parameter(Mandatory = $true)]
  [string]$Route,
  [Parameter(Mandatory = $true)]
  [string]$Text
)

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
  $script:ws.SendAsync([ArraySegment[byte]]::new($bytes), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $script:ct).GetAwaiter().GetResult()

  while ($true) {
    $chunks = New-Object System.Collections.Generic.List[string]
    do {
      $buffer = New-Object byte[] 1048576
      $result = $script:ws.ReceiveAsync([ArraySegment[byte]]::new($buffer), $script:ct).GetAwaiter().GetResult()
      $chunks.Add([Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count))
    } while (-not $result.EndOfMessage)
    $raw = [string]::Join('', $chunks)
    if (-not $raw) { continue }
    try {
      $message = $raw | ConvertFrom-Json
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
Send-Cdp 'Page.navigate' @{ url = "http://localhost:5173/admin/#$Route" } | Out-Null
Start-Sleep -Seconds 3

$escapedText = ($Text | ConvertTo-Json -Compress)
$clickExpression = @"
(() => {
  const targetText = $escapedText
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()
  const visible = (el) => {
    const rect = el.getBoundingClientRect()
    const style = getComputedStyle(el)
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
  }
  const controls = [...document.querySelectorAll('button, uni-button, a')]
  const control = controls.find((el) => visible(el) && clean(el.innerText || el.textContent) === targetText)
  if (!control) return { clicked: false, url: location.href, reason: 'control not found' }
  control.click()
  return { clicked: true, url: location.href }
})()
"@

$clickResult = Eval-Js $clickExpression
Start-Sleep -Seconds 3

$readExpression = @'
(() => {
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()
  const text = document.body.innerText.replace(/\n{3,}/g, '\n\n').slice(0, 5000)
  const buttons = [...document.querySelectorAll('button, uni-button')]
    .map((el) => clean(el.innerText || el.textContent))
    .filter(Boolean)
    .slice(0, 80)
  const inputs = [...document.querySelectorAll('input, textarea')]
    .map((el) => ({ type: el.type || el.tagName, valueLen: (el.value || '').length, value: String(el.value || '').slice(0, 80) }))
    .slice(0, 60)
  const errors = [...document.querySelectorAll('.uni-error-message, .error, [class*=error]')]
    .map((el) => clean(el.innerText || el.textContent))
    .filter(Boolean)
    .slice(0, 20)
  return { title: document.title, url: location.href, text, buttons, inputs, errors }
})()
'@

$value = Eval-Js $readExpression
[pscustomobject]@{
  route = $Route
  clicked = $clickResult.clicked
  clickReason = $clickResult.reason
  url = $value.url
  text = $value.text
  buttons = $value.buttons
  inputs = $value.inputs
  errors = $value.errors
} | ConvertTo-Json -Depth 10

$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', $ct).GetAwaiter().GetResult()
