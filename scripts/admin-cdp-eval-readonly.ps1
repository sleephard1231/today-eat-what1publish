param(
  [Parameter(Mandatory = $true)]
  [string]$Expression,
  [switch]$AwaitPromise
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
  }
}

Send-Cdp 'Runtime.enable' | Out-Null

$response = Send-Cdp 'Runtime.evaluate' @{
  expression = $Expression
  returnByValue = $true
  awaitPromise = [bool]$AwaitPromise
}

$response.result.result.value | ConvertTo-Json -Depth 30

$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', $ct).GetAwaiter().GetResult()
