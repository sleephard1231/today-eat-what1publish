param(
  [Parameter(Mandatory = $true)]
  [string]$Collection,
  [string]$WhereJson = '{}',
  [int]$Limit = 5
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

Send-Cdp 'Runtime.enable' | Out-Null
$collectionJson = $Collection | ConvertTo-Json -Compress
$whereLiteral = $WhereJson
$expression = @"
(async () => {
  const db = uniCloud.database()
  const res = await db.collection($collectionJson).where($whereLiteral).limit($Limit).get()
  return JSON.parse(JSON.stringify(res.result || res))
})()
"@

$response = Send-Cdp 'Runtime.evaluate' @{
  expression = $expression
  returnByValue = $true
  awaitPromise = $true
}

$response.result.result.value | ConvertTo-Json -Depth 20
$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', $ct).GetAwaiter().GetResult()
