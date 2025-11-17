// This file is ONLY for server-side usage - never import in client code

function cleanText(text) {
  if (!text) return null
  return text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim() || null
}

function parseNumberLike(input) {
  if (input == null) return null
  if (typeof input === "number" && isFinite(input)) return input
  const s = String(input).replace(/\s/g, "").replace(",", ".")
  const match = s.match(/([0-9]+(?:\.[0-9]+)?)/)
  return match ? Number(match[1]) : null
}

function extractJsonLdBlocks(html) {
  const blocks = []
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  
  while ((match = regex.exec(html)) !== null) {
    try {
      const obj = JSON.parse(match[1])
      Array.isArray(obj) ? blocks.push(...obj) : blocks.push(obj)
    } catch (e) {
      // Ignore malformed JSON-LD
    }
  }
  
  return blocks
}

function extractMeta(html, nameOrProp) {
  const safe = nameOrProp.replace(/[:/.-]/g, c => "\\" + c)
  const regex = new RegExp(`<meta\\s+(?:name|property)=["']${safe}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i")
  const match = html.match(regex)
  return match ? match[1] : null
}

function extractImagesFromHead(html) {
  const urls = []
  const regex = /<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+images1\.vinted\.net[^"']+)["']/gi
  let match
  
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1])
  }
  
  if (!urls.length) {
    const ogImage = extractMeta(html, "og:image")
    if (ogImage) urls.push(ogImage)
  }
  
  return Array.from(new Set(urls))
}

function extractStructuredFromScripts(html) {
  const hits = []
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi
  let scriptMatch
  
  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    const raw = scriptMatch[1]
    if (/__next|self\.__next_f|__NEXT_DATA__|next|webpack/i.test(raw)) {
      try {
        const objs = tryJsonParseAll(raw)
        for (const obj of objs) {
          deepFindAllGeneric(obj, hits)
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }
  
  return hits
}

function unescapeJsString(s) {
  return s
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&")
    .replace(/\\x3c/gi, "<")
    .replace(/\\x3e/gi, ">")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
}

function tryJsonParseAll(raw) {
  const out = []
  const parts = raw.split(/push\(|\);\s*|=\s*/).map(unescapeJsString)
  
  for (const part of parts) {
    const candidate = part.trim()
    if (!candidate) continue
    
    const matches = candidate.match(/(\{[\s\S]*?\}|\[[\s\S]*?\])/g) || []
    for (const block of matches) {
      if (block.length < 20) continue
      try {
        out.push(JSON.parse(block))
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  
  return out
}

function deepFindAllGeneric(node, hits, path = "") {
  if (!node || typeof node !== "object") return

  // Price candidates
  const hasPriceCandidate = (
    // Pattern 1: node.price avec currency
    (node.price && (node.currency || node.currencyCode || node.price?.currency || node.price?.numerical !== undefined)) ||
    // Pattern 2: node avec amount/numerical et currency
    ((node.amount !== undefined || node.numerical !== undefined) && (node.currency || node.currencyCode)) ||
    // Pattern 3: node.totalPrice ou finalPrice
    (node.totalPrice !== undefined || node.finalPrice !== undefined) ||
    // Pattern 4: patterns spécifiques Vinted
    (node.priceNumeric !== undefined || node.price_numeric !== undefined) ||
    // Pattern 5: objet avec price_amount
    (node.price_amount !== undefined)
  )
  if (hasPriceCandidate) {
    hits.push({ type: "priceNode", node, path })
  }

  // Shipping details
  if (node.shippingDetails?.price) {
    hits.push({ type: "shipping", node: node.shippingDetails.price, path })
  }

  // Protection fee
  if (node.buyerProtection?.finalPrice || node.buyerProtection?.originalPrice) {
    hits.push({ type: "protection", node: node.buyerProtection, path })
  }

  // Boolean flags
  if (typeof node.canBuy === "boolean" || 
      typeof node.canInstantBuy === "boolean" ||
      typeof node.isReserved === "boolean" || 
      typeof node.isHidden === "boolean") {
    hits.push({ type: "flags", node, path })
  }

  // Status and condition
  if (node.code === "status" && node.value) {
    hits.push({ type: "status", node, path })
  }

  // Upload date
  if (node.code === "upload_date" && node.value) {
    hits.push({ type: "added", node, path })
  }

  // Description
  if (node.description && typeof node.description === "string") {
    hits.push({ type: "description", node, path })
  }

  // Photos
  if (Array.isArray(node.photos) && node.photos.length) {
    hits.push({ type: "photos", node, path })
  }

  // Favourites
  if (typeof node.favourite_count === "number") {
    hits.push({ type: "favourites", node, path })
  }
  if (typeof node.favouriteCount === "number") {
    hits.push({ type: "favourites", node: { favourite_count: node.favouriteCount }, path })
  }

  // Recurse into nested objects
  for (const [key, value] of Object.entries(node)) {
    deepFindAllGeneric(value, hits, path ? `${path}.${key}` : key)
  }
}

function extractDomElements(html) {
  const elements = {}
  
  // Title extraction
  const titleMatch = html.match(/<h1[^>]*data-testid=["']item-title["'][^>]*>([^<]+)<\/h1>/i)
  if (titleMatch) {
    elements.title = cleanText(titleMatch[1])
  }
  
  // Description extraction
  const descMatch = html.match(/<[^>]*data-testid=["']item-description["'][^>]*>([^<]+)</i)
  if (descMatch) {
    elements.description = cleanText(descMatch[1])
  }
  
  return elements
}

function extractProtectionFeeNote(html) {
  const around = html.match(/.{0,200}protection.{0,200}/i)?.[0] || ''
  const match = around.match(/au lieu de\s*([0-9][\d\s.,]*\s*€)/i)
  if (match && match[1]) {
    const ref = match[1].replace(/\s+/g, ' ').trim()
    return `remise en cours (au lieu de ${ref})`
  }
  return null
}

function extractAddedSinceStrict(html) {
  const match = html.match(/Il y a\s+(\d+)\s+(minute|minutes|heure|heures|jour|jours|semaine|semaines|mois|an|ans)\b/i)
  return match ? `Il y a ${match[1]} ${match[2]}` : null
}

function extractPriceFromHtml(html) {
  // Pattern 1: Prix dans les meta tags
  const priceMetaMatch = html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i)
  if (priceMetaMatch) {
    const price = parseNumberLike(priceMetaMatch[1])
    if (price) return price
  }

  // Pattern 2: Prix dans les données structurées JSON-LD
  const priceJsonMatch = html.match(/"price":\s*"?([0-9]+(?:[.,][0-9]+)?)"?/i)
  if (priceJsonMatch) {
    const price = parseNumberLike(priceJsonMatch[1])
    if (price) return price
  }

  // Pattern 3: Prix dans les éléments DOM avec data-testid
  const priceDomMatch = html.match(/<[^>]*data-testid=["'][^"']*price[^"']*["'][^>]*>([^<]*[0-9]+[^<]*)</i)
  if (priceDomMatch) {
    const price = parseNumberLike(priceDomMatch[1])
    if (price) return price
  }

  // Pattern 4: Prix dans les scripts avec patterns spécifiques
  const priceScriptMatches = [
    /"price_amount":\s*([0-9]+(?:[.,][0-9]+)?)/i,
    /"priceNumeric":\s*([0-9]+(?:[.,][0-9]+)?)/i,
    /"price_numeric":\s*([0-9]+(?:[.,][0-9]+)?)/i,
    /"amount":\s*([0-9]+(?:[.,][0-9]+)?)/i,
    /"numerical":\s*([0-9]+(?:[.,][0-9]+)?)/i
  ]

  for (const pattern of priceScriptMatches) {
    const match = html.match(pattern)
    if (match) {
      const price = parseNumberLike(match[1])
      if (price) return price
    }
  }

  // Pattern 5: Prix dans le texte visible (dernier recours)
  const visiblePriceMatch = html.match(/([0-9]+(?:[.,][0-9]+)?)\s*€/g)
  if (visiblePriceMatch) {
    // Prendre le premier prix trouvé qui semble raisonnable (> 0.1€)
    for (const priceStr of visiblePriceMatch) {
      const price = parseNumberLike(priceStr)
      if (price && price > 0.1) return price
    }
  }

  return null
}
function parseItemFromHtml(html, id) {
  // Basic DOM extraction
  const domElements = extractDomElements(html)
  let title = domElements.title || null
  let descriptionDom = domElements.description || null

  // JSON-LD extraction
  const ldBlocks = extractJsonLdBlocks(html)
  const ldProduct = ldBlocks.find(n => (n?.["@type"] || "").toLowerCase() === "product") || ldBlocks[0]
  const titleLd = cleanText(ldProduct?.name || null)
  const descLd = cleanText(ldProduct?.description || null)

  // Meta tags
  const metaTitle = cleanText(extractMeta(html, "og:title"))
  const metaDesc = cleanText(extractMeta(html, "og:description"))

  // Images
  let images = extractImagesFromHead(html)

  // Added since from HTML
  let addedSince = null
  const addedSinceMatch = html.match(/"added_since":"([^"]+)"/)
  if (addedSinceMatch) {
    addedSince = addedSinceMatch[1]
  } else {
    addedSince = extractAddedSinceStrict(html)
  }

  // Extract structured data from scripts
  const hits = extractStructuredFromScripts(html)
  const pick = (type) => hits.find(h => h.type === type)?.node

  const priceNode = pick("priceNode")
  const flagsNode = pick("flags")
  const shippingNode = pick("shipping")
  const protectionNode = pick("protection")
  const statusNode = pick("status")
  const addedNode = pick("added")
  const descNode = pick("description")
  const photosNode = pick("photos")
  const favouritesNode = pick("favourites")

  // Parse extracted data
  let price_amount = null
  
  // Essayer plusieurs sources pour le prix
  if (priceNode) {
    price_amount = parseNumberLike(
      priceNode.price?.numerical ?? 
      priceNode.price?.amount ?? 
      priceNode.price ?? 
      priceNode.amount ?? 
      priceNode.numerical ?? 
      priceNode.priceNumeric ?? 
      priceNode.price_numeric ?? 
      priceNode.price_amount ?? 
      priceNode.totalPrice ?? 
      priceNode.finalPrice ?? 
      null
    )
  }
  
  // Si pas trouvé dans les données structurées, essayer l'extraction HTML
  if (!price_amount) {
    price_amount = extractPriceFromHtml(html)
  }
  
  let price_currency = priceNode?.currency || priceNode?.currencyCode || priceNode?.price?.currency || "EUR"

  const can_buy = flagsNode?.canBuy ?? null
  const can_instant_buy = flagsNode?.canInstantBuy ?? null
  const is_reserved = flagsNode?.isReserved ?? null
  const is_hidden = flagsNode?.isHidden ?? null

  const shipping_fee = parseNumberLike(shippingNode?.amount ?? null)

  const protFinal = parseNumberLike(protectionNode?.finalPrice?.amount ?? null)
  const protOrig = parseNumberLike(protectionNode?.originalPrice?.amount ?? null)
  const protection_fee_amount = protFinal ?? null
  const protection_fee_note = (protOrig && protFinal && protOrig > protFinal)
    ? `remise en cours (au lieu de ${protOrig.toFixed(2).replace(".", ",")} €)`
    : extractProtectionFeeNote(html)

  const condition = cleanText(statusNode?.value || null)
  addedSince = cleanText(addedNode?.value || addedSince || null)

  const description = cleanText(descNode?.description || descriptionDom || descLd || metaDesc) || null
  const titleFinal = titleLd || metaTitle || title || null

  // Photos from structured data
  if (photosNode?.photos?.length) {
    const urls = photosNode.photos.map((p) => p?.url).filter(Boolean)
    if (urls.length) {
      images = Array.from(new Set([...images, ...urls]))
    }
  }

  // Favourite count
  const favourite_count = (typeof favouritesNode?.favourite_count === "number" 
    ? favouritesNode.favourite_count 
    : null) ?? (() => {
      const match = html.match(/aria-label="[^"]*favoris[^"]*?(\d+)\s+utilisateurs?/i) || 
                   html.match(/>\s*(\d+)\s*<\/span>\s*<\/button>\s*<!--\s*favourite/i)
      return match ? parseInt(match[1], 10) : 0
    })()

  return {
    title: titleFinal,
    description,
    condition,
    price_amount,
    price_currency,
    can_buy,
    can_instant_buy,
    is_reserved,
    is_hidden,
    protection_fee_amount,
    protection_fee_note,
    shipping_fee,
    added_since: addedSince,
    images,
    favourite_count
  }
}

module.exports = { parseItemFromHtml }