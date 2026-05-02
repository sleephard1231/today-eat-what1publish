#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const cloudRoot = path.join(rootDir, 'uniCloud-aliyun', 'cloudfunctions')
const databaseRoot = path.join(rootDir, 'uniCloud-aliyun', 'database')
const cloudAdapterPath = path.join(rootDir, 'utils', 'cloud.js')

const cloudObjects = {
  getCoUser: 'co-user',
  getCoCampus: 'co-campus',
  getCoContent: 'co-content',
  getCoAi: 'co-ai'
}

const requiredCollections = [
  'eat-what-users',
  'eat-what-state',
  'eat-what-history',
  'eat-what-applications',
  'eat-what-campuses',
  'eat-what-canteens',
  'eat-what-stalls',
  'eat-what-dishes',
  'eat-what-normal-dishes',
  'eat-what-services',
  'eat-what-ai-config',
  'eat-what-ai-usage'
]

const results = {
  pass: 0,
  warn: 0,
  fail: 0
}

function relative(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/')
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8')
}

function mark(type, title, detail = '') {
  results[type] += 1
  const prefix = type === 'pass' ? 'PASS' : type === 'warn' ? 'WARN' : 'FAIL'
  console.log(`[${prefix}] ${title}`)
  if (detail) {
    console.log(`       ${detail}`)
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
}

function dirExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
}

function checkNodeSyntax(filePath) {
  const res = spawnSync(process.execPath, ['--check', filePath], {
    cwd: rootDir,
    encoding: 'utf8'
  })

  if (res.status === 0) {
    mark('pass', `JS syntax ok: ${relative(filePath)}`)
    return true
  }

  mark('fail', `JS syntax failed: ${relative(filePath)}`, (res.stderr || res.stdout || '').trim())
  return false
}

function extractExportedMethods(source) {
  const methods = new Set()
  const methodPattern = /^\s{2}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/gm
  let match

  while ((match = methodPattern.exec(source))) {
    const name = match[1]
    if (!name.startsWith('_')) {
      methods.add(name)
    }
  }

  return methods
}

function extractCloudCalls(source) {
  const calls = []
  const functionPattern = /export\s+async\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g
  const functions = []
  let match

  while ((match = functionPattern.exec(source))) {
    functions.push({
      name: match[1],
      start: match.index
    })
  }

  for (let index = 0; index < functions.length; index += 1) {
    const current = functions[index]
    const next = functions[index + 1]
    const body = source.slice(current.start, next ? next.start : source.length)
    const getterMatch = body.match(/const\s+co\s*=\s*(getCo[A-Za-z]+)\s*\(\)/)
    if (!getterMatch) continue

    const getter = getterMatch[1]
    const methodPattern = /co\.([A-Za-z_$][\w$]*)\s*\(/g
    const methods = new Set()
    let methodMatch

    while ((methodMatch = methodPattern.exec(body))) {
      methods.add(methodMatch[1])
    }

    for (const method of methods) {
      calls.push({
        wrapper: current.name,
        getter,
        method,
        objectName: cloudObjects[getter] || ''
      })
    }
  }

  return calls
}

function checkCloudFunctions() {
  if (!dirExists(cloudRoot)) {
    mark('fail', 'Missing uniCloud cloudfunctions directory', relative(cloudRoot))
    return {}
  }

  const methodMap = {}
  for (const objectName of fs.readdirSync(cloudRoot)) {
    const objectDir = path.join(cloudRoot, objectName)
    if (!dirExists(objectDir)) continue

    const packagePath = path.join(objectDir, 'package.json')
    const indexObjPath = path.join(objectDir, 'index.obj.js')
    const indexJsPath = path.join(objectDir, 'index.js')
    const entryPath = fileExists(indexObjPath) ? indexObjPath : indexJsPath

    if (!fileExists(packagePath)) {
      mark('fail', `Missing package.json: ${objectName}`)
    } else {
      try {
        const pkg = JSON.parse(readText(packagePath))
        const config = pkg['cloudfunction-config'] || {}
        const triggers = Array.isArray(config.triggers) ? config.triggers : []
        const memorySize = Number(config.memorySize || 0)

        if (triggers.length) {
          mark('warn', `${objectName} has triggers`, JSON.stringify(triggers))
        } else {
          mark('pass', `${objectName} has no timer triggers`)
        }

        if (memorySize > 128) {
          mark('warn', `${objectName} memorySize is ${memorySize}MB`, 'Higher memory increases GBs cost.')
        } else if (memorySize === 128) {
          mark('pass', `${objectName} memorySize is 128MB`)
        } else {
          mark('warn', `${objectName} memorySize is not set to 128MB`, `Current value: ${config.memorySize}`)
        }
      } catch (err) {
        mark('fail', `Invalid package.json: ${objectName}`, err.message)
      }
    }

    if (!entryPath || !fileExists(entryPath)) {
      mark('fail', `Missing cloud function entry: ${objectName}`)
      continue
    }

    checkNodeSyntax(entryPath)

    if (path.basename(entryPath) === 'index.obj.js') {
      methodMap[objectName] = extractExportedMethods(readText(entryPath))
      mark('pass', `${objectName} exports ${methodMap[objectName].size} public methods`)
    }
  }

  return methodMap
}

function checkFrontendCloudContract(methodMap) {
  if (!fileExists(cloudAdapterPath)) {
    mark('fail', 'Missing utils/cloud.js')
    return
  }

  checkNodeSyntax(cloudAdapterPath)

  const source = readText(cloudAdapterPath)
  const calls = extractCloudCalls(source)

  if (!calls.length) {
    mark('warn', 'No cloud object calls found in utils/cloud.js')
    return
  }

  for (const call of calls) {
    if (!call.objectName) {
      mark('fail', `${call.wrapper} uses unknown cloud getter`, call.getter)
      continue
    }

    const methods = methodMap[call.objectName]
    if (!methods) {
      mark('fail', `${call.wrapper} targets missing cloud object`, call.objectName)
      continue
    }

    if (methods.has(call.method)) {
      mark('pass', `${call.wrapper} -> ${call.objectName}.${call.method}`)
    } else {
      mark('fail', `${call.wrapper} calls missing method`, `${call.objectName}.${call.method}`)
    }
  }
}

function checkDatabaseSchemas() {
  if (!dirExists(databaseRoot)) {
    mark('fail', 'Missing database schema directory', relative(databaseRoot))
    return
  }

  for (const collection of requiredCollections) {
    const schemaPath = path.join(databaseRoot, `${collection}.schema.json`)
    if (!fileExists(schemaPath)) {
      mark('fail', `Missing database schema: ${collection}`)
      continue
    }

    try {
      JSON.parse(readText(schemaPath))
      mark('pass', `Database schema exists: ${collection}`)
    } catch (err) {
      mark('fail', `Invalid database schema JSON: ${collection}`, err.message)
    }
  }
}

function checkImportantConfig() {
  const coCampus = path.join(cloudRoot, 'co-campus', 'index.obj.js')
  const coUser = path.join(cloudRoot, 'co-user', 'index.obj.js')
  const coAi = path.join(cloudRoot, 'co-ai', 'index.obj.js')

  if (fileExists(coCampus)) {
    const source = readText(coCampus)
    if (/const\s+ADMIN_OPENIDS\s*=\s*\[\s*\]/.test(source)) {
      mark('warn', 'ADMIN_OPENIDS is empty', 'Admin-only write APIs will return no permission until you add your openid.')
    } else {
      mark('pass', 'ADMIN_OPENIDS is not empty')
    }
  }

  if (fileExists(coUser)) {
    const source = readText(coUser)
    if (/WX_APPSECRET\s*=\s*['"](?:你的|your-|xxx|)['"]/.test(source)) {
      mark('warn', 'WX_APPSECRET looks like a placeholder')
    } else {
      mark('pass', 'WX_APPSECRET is configured or not obviously placeholder')
    }
  }

  if (fileExists(coAi)) {
    const source = readText(coAi)
    if (/DASHSCOPE_API_KEY\s*=\s*['"](?:你的|your-|xxx|)['"]/.test(source)) {
      mark('warn', 'DASHSCOPE_API_KEY looks like a placeholder', 'AI calls will fail until configured.')
    } else {
      mark('pass', 'DASHSCOPE_API_KEY is configured or loaded from DB/config')
    }
  }
}

function checkPagesJson() {
  const pagesJsonPath = path.join(rootDir, 'pages.json')
  if (!fileExists(pagesJsonPath)) {
    mark('fail', 'Missing pages.json')
    return
  }

  try {
    const json = JSON.parse(readText(pagesJsonPath))
    const pages = Array.isArray(json.pages) ? json.pages : []
    for (const page of pages) {
      if (!page.path) continue
      const vuePath = path.join(rootDir, `${page.path}.vue`)
      if (fileExists(vuePath)) {
        mark('pass', `Route file exists: ${page.path}`)
      } else {
        mark('fail', `Route file missing: ${page.path}`, relative(vuePath))
      }
    }
  } catch (err) {
    mark('fail', 'Invalid pages.json', err.message)
  }
}

console.log('Cloud connectivity static check')
console.log(`Workspace: ${rootDir}`)
console.log('')

const methodMap = checkCloudFunctions()
console.log('')
checkFrontendCloudContract(methodMap)
console.log('')
checkDatabaseSchemas()
console.log('')
checkImportantConfig()
console.log('')
checkPagesJson()
console.log('')
console.log(`Summary: ${results.pass} passed, ${results.warn} warnings, ${results.fail} failed`)

if (results.fail > 0) {
  process.exitCode = 1
}
