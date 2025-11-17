import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { analyzeItemVisually, generateVisionFingerprint, needsVisionAnalysis } from '@/lib/ai/vision'
import { applyVisionToItem, getSimilarItemsByPeerKey } from '@/lib/ai/vision-writeback'
import { analyzeDealText } from '@/lib/ai/deal-text'
import type { VintedItem } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    // Vérifier la clé API
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, itemIds, forceReanalyze = false } = body

    if (!itemId && (!itemIds || !Array.isArray(itemIds))) {
      return NextResponse.json({ 
        error: 'Either itemId or itemIds array is required' 
      }, { status: 400 })
    }

    const idsToAnalyze = itemId ? [itemId] : itemIds
    const results: Array<{ 
      itemId: number
      visionApplied: boolean
      dealAnalysis?: any
      error?: string 
    }> = []

    console.log(`👁️ Starting Vision-First analysis for ${idsToAnalyze.length} items...`)

    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database not available' 
      }, { status: 500 })
    }

    for (const id of idsToAnalyze) {
      try {
        // Récupérer l'item de la base
        const { data: item, error: fetchError } = await supabase
          .from('vinted_items')
          .select('*')
          .eq('id', id)
          .single()

        if (fetchError || !item) {
          results.push({
            itemId: id,
            visionApplied: false,
            error: 'Item not found'
          })
          continue
        }

        console.log(`🔍 Processing item ${id}: ${item.title}`)

        let visionApplied = false
        let updatedItem = item

        // ÉTAPE 1: Vision d'abord (si nécessaire)
        if (needsVisionAnalysis(item, forceReanalyze)) {
          console.log(`👁️ Running vision analysis for item ${id}`)
          
          const visual = await analyzeItemVisually(item as VintedItem)
          
          if (visual) {
            const fingerprint = generateVisionFingerprint(item as VintedItem)
            await applyVisionToItem(supabase, item, visual, fingerprint)
            visionApplied = true
            
            // Re-fetch l'item avec les nouvelles données vision
            const { data: freshItem } = await supabase
              .from('vinted_items')
              .select('*')
              .eq('id', id)
              .single()
            
            if (freshItem) {
              updatedItem = freshItem
              console.log(`✅ Vision facts applied for item ${id}:`, {
                platform: freshItem.ai_platform,
                region: freshItem.ai_region,
                completeness: freshItem.ai_completeness,
                condition: freshItem.ai_condition_grade,
                peer_key: freshItem.peer_key
              })
            }
          }
        } else {
          console.log(`⏭️ Skipping vision analysis for item ${id} (already analyzed or no photos)`)
        }

        // ÉTAPE 2: Récupérer les peers basés sur la peer_key mise à jour
        const peerKey = updatedItem.peer_key
        const similarItems = peerKey ? 
          await getSimilarItemsByPeerKey(supabase, peerKey, id, 25) : 
          []

        console.log(`📊 Found ${similarItems.length} peer items for comparison`)

        // ÉTAPE 3: Analyse deal textuelle avec contexte vision
        const dealAnalysis = await analyzeDealText({
          item: updatedItem as VintedItem,
          similarItems
        })

        // ÉTAPE 4: Sauvegarder l'analyse deal
        const dealPatch = {
          is_deal: dealAnalysis.isDeal,
          deal_score: dealAnalysis.dealScore.toString(),
          deal_reason: dealAnalysis.reasoning,
          deal_detected_at: new Date().toISOString(),
          gpt_analysis: dealAnalysis,
          gpt_confidence: dealAnalysis.confidence,
          gpt_recommendation: dealAnalysis.recommendation,
          estimated_market_value: dealAnalysis.estimatedMarketValue || null,
          gpt_analyzed_at: new Date().toISOString()
        }

        const { error: updateError } = await supabase
          .from('vinted_items')
          .update(dealPatch)
          .eq('id', id)

        if (updateError) {
          console.error(`❌ Error updating deal analysis for item ${id}:`, updateError)
        } else {
          console.log(`💾 Saved deal analysis for item ${id}: ${dealAnalysis.isDeal ? 'DEAL' : 'NO DEAL'} (Score: ${dealAnalysis.dealScore})`)
        }

        results.push({
          itemId: id,
          visionApplied,
          dealAnalysis
        })

        // Pause pour éviter de surcharger les APIs
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Error processing item ${id}:`, error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        results.push({
          itemId: id,
          visionApplied: false,
          error: errorMessage
        })
      }
    }

    const successCount = results.filter(r => !r.error).length
    const visionCount = results.filter(r => r.visionApplied).length
    const dealCount = results.filter(r => r.dealAnalysis?.isDeal).length

    console.log(`🎉 Vision-First analysis complete: ${successCount}/${idsToAnalyze.length} processed, ${visionCount} vision analyses, ${dealCount} deals found`)

    return NextResponse.json({
      success: true,
      processed: successCount,
      total: idsToAnalyze.length,
      visionAnalyses: visionCount,
      dealsFound: dealCount,
      results
    })

  } catch (error) {
    console.error('Vision-First Analysis API Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      error: 'Internal server error',
      details: errorMessage
    }, { status: 500 })
  }
}