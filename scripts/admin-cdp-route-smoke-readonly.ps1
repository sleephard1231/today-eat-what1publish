param(
  [int]$DelayMs = 1800
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

$expression = @"
(async () => {
  const delayMs = $DelayMs
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim()
  const db = uniCloud.database()
  const firstId = async (collection) => {
    try {
      const res = await db.collection(collection).limit(1).get()
      const data = res?.result?.data || res?.data || []
      return data[0]?._id || ''
    } catch (error) {
      return ''
    }
  }
  const ids = {
    campus: await firstId('eat-what-campuses'),
    canteen: await firstId('eat-what-canteens'),
    stall: await firstId('eat-what-stalls'),
    dish: await firstId('eat-what-dishes'),
    normalDish: await firstId('eat-what-normal-dishes'),
    service: await firstId('eat-what-services')
  }
  const routes = [
    { name: 'index', url: '/pages/index/index' },
    { name: 'campus-list', url: '/pages/eat-what/campus/list' },
    { name: 'campus-add', url: '/pages/eat-what/campus/add' },
    ids.campus && { name: 'campus-edit', url: '/pages/eat-what/campus/edit?id=' + ids.campus },
    { name: 'canteen-list', url: '/pages/eat-what/canteen/list' },
    { name: 'canteen-add', url: '/pages/eat-what/canteen/add' },
    ids.canteen && { name: 'canteen-edit', url: '/pages/eat-what/canteen/edit?id=' + ids.canteen },
    { name: 'stall-list', url: '/pages/eat-what/stall/list' },
    { name: 'stall-add', url: '/pages/eat-what/stall/add' },
    ids.stall && { name: 'stall-edit', url: '/pages/eat-what/stall/edit?id=' + ids.stall },
    { name: 'dish-list', url: '/pages/eat-what/dish/list' },
    { name: 'dish-add', url: '/pages/eat-what/dish/add' },
    ids.dish && { name: 'dish-edit', url: '/pages/eat-what/dish/edit?id=' + ids.dish },
    { name: 'normal-dish-list', url: '/pages/eat-what/normal-dish/list' },
    { name: 'normal-dish-add', url: '/pages/eat-what/normal-dish/add' },
    ids.normalDish && { name: 'normal-dish-edit', url: '/pages/eat-what/normal-dish/edit?id=' + ids.normalDish },
    { name: 'application-list', url: '/pages/eat-what/application/list' },
    { name: 'service-list', url: '/pages/eat-what/service/list' },
    { name: 'service-add', url: '/pages/eat-what/service/add' },
    ids.service && { name: 'service-edit', url: '/pages/eat-what/service/edit?id=' + ids.service },
    { name: 'user-list', url: '/pages/eat-what/user/list' },
    { name: 'history-list', url: '/pages/eat-what/history/list' },
    { name: 'ai-config', url: '/pages/eat-what/ai-config/index' }
  ].filter(Boolean)

  const nav = (url) => new Promise(resolve => {
    const done = (type, detail) => resolve({ type, detail: detail && (detail.errMsg || detail.message || detail) })
    uni.redirectTo({ url, success: (res) => done('success', res), fail: (err) => done('fail', err) })
  })

  const results = []
  for (const route of routes) {
    const navResult = await nav(route.url)
    await sleep(delayMs)
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const page = pages[pages.length - 1]
    const vm = page && (page.`$vm || page)
    const text = document.body.innerText || ''
    const visibleText = clean(text)
    const inputValues = [...document.querySelectorAll('input, textarea')]
      .map(el => el.value || '')
      .filter(Boolean)
      .slice(0, 10)
    const errorText = [...document.querySelectorAll('.uni-error-message, [class*="error"], [class*="danger"]')]
      .map(el => clean(el.innerText || el.textContent))
      .filter(Boolean)
      .slice(0, 10)
    results.push({
      name: route.name,
      url: route.url,
      nav: navResult,
      href: location.href,
      currentRoute: page?.route || '',
      options: page?.options || {},
      title: document.title,
      textSample: visibleText.slice(0, 260),
      hasLoading: visibleText.includes('\u52a0\u8f7d\u4e2d...'),
      inputValues,
      errorText,
      state: vm ? {
        formId: vm.formId || vm.stallId || '',
        formData: vm.formData || null,
        listCount: Array.isArray(vm.list) ? vm.list.length : null,
        campusOptions: Array.isArray(vm.campusOptions) ? vm.campusOptions.length : null,
        canteenOptions: Array.isArray(vm.canteenOptions) ? vm.canteenOptions.length : null,
        stallOptions: Array.isArray(vm.stallOptions) ? vm.stallOptions.length : null,
        dishes: Array.isArray(vm.dishes) ? vm.dishes.length : null
      } : null
    })
  }
  return { ids, results }
})()
"@

$response = Send-Cdp 'Runtime.evaluate' @{
  expression = $expression
  returnByValue = $true
  awaitPromise = $true
}

[pscustomobject]@{
  page = $response.result.result.value
  exception = $response.result.exceptionDetails
  resultMeta = $response.result.result
  events = $script:events
} | ConvertTo-Json -Depth 40

$ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', $ct).GetAwaiter().GetResult()
