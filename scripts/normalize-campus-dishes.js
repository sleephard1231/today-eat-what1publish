#!/usr/bin/env node

/*
 * Preview or normalize campus dishes with incomplete canteen/stall linkage.
 *
 * Default:
 *   node scripts/normalize-campus-dishes.js
 *
 * Apply changes:
 *   node scripts/normalize-campus-dishes.js --apply
 *
 * This script is intentionally conservative. It expects a uniCloud database
 * client to be injected by the HBuilderX/cloud runtime. In plain Node it prints
 * instructions instead of trying to connect with hidden credentials.
 */

const APPLY = process.argv.includes('--apply')

function hasUniCloudRuntime() {
  return typeof uniCloud !== 'undefined' && uniCloud.database
}

if (!hasUniCloudRuntime()) {
  console.log('This script must run in a uniCloud-capable runtime, such as HBuilderX cloud function tooling.')
  console.log('Preview is safe by default. Add --apply only after checking the generated plan.')
  console.log('')
  console.log('What it does:')
  console.log('1. Backfill canteenId for dishes that have a valid stallId.')
  console.log('2. Create one active "精选菜品" stall per affected canteen when needed.')
  console.log('3. Update only those orphan dishes to point at the generated stall.')
  process.exit(0)
}

const db = uniCloud.database()
const canteens = db.collection('eat-what-canteens')
const stalls = db.collection('eat-what-stalls')
const dishes = db.collection('eat-what-dishes')

async function main() {
  const { data: activeCanteens } = await canteens.where({ status: 'active' }).get()
  const canteenIds = activeCanteens.map((item) => item._id)
  const canteenMap = new Map(activeCanteens.map((item) => [item._id, item]))

  const { data: activeStalls } = await stalls.where({ status: 'active' }).get()
  const validStallIds = new Set(activeStalls.map((item) => item._id))
  const stallCanteenMap = new Map(activeStalls.map((item) => [item._id, item.canteenId]))
  const generatedStallsByCanteen = new Map(
    activeStalls
      .filter((item) => item.name === '精选菜品')
      .map((item) => [item.canteenId, item])
  )

  const { data: activeDishes } = await dishes.where({ status: 'active' }).get()
  const canteenBackfillDishes = activeDishes.filter((dish) => (
    !dish.canteenId &&
    dish.stallId &&
    validStallIds.has(dish.stallId) &&
    stallCanteenMap.get(dish.stallId)
  ))
  const orphanDishes = activeDishes.filter((dish) => (
    dish.canteenId &&
    canteenIds.includes(dish.canteenId) &&
    (!dish.stallId || !validStallIds.has(dish.stallId))
  ))

  const byCanteen = new Map()
  orphanDishes.forEach((dish) => {
    if (!byCanteen.has(dish.canteenId)) byCanteen.set(dish.canteenId, [])
    byCanteen.get(dish.canteenId).push(dish)
  })

  console.log(`Mode: ${APPLY ? 'APPLY' : 'PREVIEW'}`)
  console.log(`Dishes missing canteenId: ${canteenBackfillDishes.length}`)
  console.log(`Affected canteens: ${byCanteen.size}`)
  console.log(`Orphan dishes: ${orphanDishes.length}`)

  for (const dish of canteenBackfillDishes) {
    const canteenId = stallCanteenMap.get(dish.stallId)
    console.log(`- backfill ${dish.name || dish._id}: canteenId=${canteenId}`)
    if (APPLY) {
      await dishes.doc(dish._id).update({
        canteenId,
        updatedAt: Date.now()
      })
    }
  }

  for (const [canteenId, list] of byCanteen.entries()) {
    const canteen = canteenMap.get(canteenId)
    let targetStall = generatedStallsByCanteen.get(canteenId)
    console.log(`- ${canteen?.name || canteenId}: ${list.length} dishes`)

    if (APPLY && !targetStall) {
      const now = Date.now()
      const addRes = await stalls.add({
        canteenId,
        name: '精选菜品',
        category: '推荐',
        remark: '由历史菜品自动归档',
        sort: 999,
        status: 'active',
        createdAt: now,
        updatedAt: now
      })
      targetStall = { _id: addRes.id, canteenId, name: '精选菜品' }
      generatedStallsByCanteen.set(canteenId, targetStall)
    }

    if (APPLY && targetStall) {
      for (const dish of list) {
        await dishes.doc(dish._id).update({
          stallId: targetStall._id,
          updatedAt: Date.now()
        })
      }
    }
  }

  console.log(APPLY ? 'Done.' : 'Preview only. Re-run with --apply to update data.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
