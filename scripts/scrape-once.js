#!/usr/bin/env node

/**
 * One-time scraping script for testing
 * Usage: node scripts/scrape-once.js "search query" [priceFrom] [priceTo] [limit]
 */

import { searchAllPages } from '../lib/scrape/searchCatalog.js'

function loadEnvFile() {
  try {
    const fs = await import('fs')
    if (fs.existsSync('.env.local')) {
      const envContent = fs.readFileSync('.env.local', 'utf8')
      const lines = envContent.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=')
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          if (key && value) process.env[key] = value
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Error loading .env.local:', error.message)
  }
}

async function main() {
  const [,, searchText, priceFrom, priceTo, maxItems] = process.argv

  if (!searchText) {
    console.error('❌ Usage: node scripts/scrape-once.js "search query" [priceFrom] [priceTo] [limit]')
    console.error('   Example: node scripts/scrape-once.js "nintendo gameboy" 10 100 50')
    process.exit(1)
  }

  await loadEnvFile()

  const accessToken = process.env.VINTED_ACCESS_TOKEN
  if (!accessToken) {
    console.error('❌ VINTED_ACCESS_TOKEN not found in environment')
    console.error('💡 Add VINTED_ACCESS_TOKEN to your .env.local file')
    process.exit(1)
  }

  console.log(`🔍 Searching for: "${searchText}"`)
  if (priceFrom) console.log(`💰 Price range: ${priceFrom}€ - ${priceTo || '∞'}€`)
  if (maxItems) console.log(`🔢 Limit: ${maxItems} items`)

  try {
    const items = await searchAllPages(searchText, {
      priceFrom: priceFrom ? Number(priceFrom) : undefined,
      priceTo: priceTo ? Number(priceTo) : undefined,
      limit: maxItems ? Number(maxItems) : 50,
      accessToken
    })

    console.log(`\n✅ Found ${items.length} items`)
    console.log('\nFirst few results:')
    
    items.slice(0, 5).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.title}`)
      console.log(`   💰 ${item.price?.amount}${item.price?.currency_code || 'EUR'} | ID: ${item.id}`)
      console.log(`   🔗 ${item.url}`)
    })

    if (items.length > 5) {
      console.log(`\n... and ${items.length - 5} more items`)
    }

  } catch (error) {
    console.error('❌ Search failed:', error.message)
    if (error.message.includes('403') || error.message.includes('401')) {
      console.log('💡 Your Vinted token may have expired. Please update VINTED_ACCESS_TOKEN')
    }
    process.exit(1)
  }
}

main().catch(console.error)