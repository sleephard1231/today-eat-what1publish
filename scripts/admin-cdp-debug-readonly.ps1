param(
  [string]$Route = ''
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
$script:events = New-Object System.Collections.Generic.List[object]

function Send-Cdp {
  param(
    [string]$Method,
    [object]$Params = $null
  )

  $script:nextId += 1
  $payload = @{
    id = $script:nextId
    method = $Method
  }
  if ($null -ne $Params) {
    $payload.params = $Params
  }

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
    if ($message.id -eq $script:nextId) {
      return $message
    }
    if ($message.method -in @('Runtime.consoleAPICalled', 'Runtime.exceptionThrown', 'Log.entryAdded', 'Page.javascriptDialogOpening')) {
      $script:events.Add($message)
    }
  }
}

Send-Cdp 'Runtime.enable' | Out-Null
Send-Cdp 'Log.enable' | Out-Null
Send-Cdp 'Page.enable' | Out-Null

if ($Route) {
  $baseUrl = 'http://localhost:5173/admin/#'
  Send-Cdp 'Page.navigate' @{ url = "$baseUrl$Route" } | Out-Null
  Start-Sleep -Milliseconds 2500
}

$expression = @'
(() => {
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()
  const text = document.body.innerText.replace(/\n{3,}/g, '\n\n').slice(0, 8000)
  const inputs = [...document.querySelectorAll('input, textarea')]
    .map((el, index) => ({
      index,
      type: el.type || el.tagName,
      placeholder: el.placeholder || '',
      value: el.value || '',
      valueLen: (el.value || '').length
    }))
  const loaders = [...document.querySelectorAll('*')]
    .filter((el) => clean(el.innerText || el.textContent) === '加载中...')
    .map((el) => ({
      tag: el.tagName,
      cls: String(el.className || '').slice(0, 160),
      display: getComputedStyle(el).display,
      visibility: getComputedStyle(el).visibility,
      opacity: getComputedStyle(el).opacity
    }))
  const errors = [...document.querySelectorAll('.uni-error-message, [class*="error"], [class*="danger"]')]
    .map((el) => clean(el.innerText || el.textContent))
    .filter(Boolean)
    .slice(0, 40)
  const vueRoots = [...document.querySelectorAll('*')]
    .filter((el) => el.__vueParentComponent)
    .slice(0, 120)
    .map((el) => {
      const component = el.__vueParentComponent
      const proxy = component && component.proxy
      return {
        tag: el.tagName,
        cls: String(el.className || '').slice(0, 120),
        text: clean(el.innerText || el.textContent).slice(0, 120),
        component: component.type && (component.type.name || component.type.__name || ''),
        data: proxy && proxy.$data ? JSON.parse(JSON.stringify(proxy.$data)) : null
      }
    })
    .filter((item) => item.data && (item.data.formData || item.data.formId || item.data.query || item.data.list))
  return { title: document.title, url: location.href, text, inputs, loaders, errors, vueRoots }
})()
'@

$response = Send-Cdp 'Runtime.evaluate' @{
  expression = $expression
  returnByValue = $true
  awaitPromise = $true
}

[pscustomobject]@{
  page = $response.result.result.value
  events = $script:events
} | ConvertTo-Json -Depth 30

$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', $ct).GetAwaiter().GetResult()
