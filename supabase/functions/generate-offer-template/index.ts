import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { propertyInfo, marketAnalysis, chatgptAnalysis, selectedScenario } = await req.json()

    if (!propertyInfo || !selectedScenario) {
      return new Response(
        JSON.stringify({ error: 'Données manquantes' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Construire le prompt pour OpenAI
    const prompt = `Tu es un expert en négociation immobilière. Rédige un modèle d'offre d'achat professionnel et convaincant pour :

Bien : ${propertyInfo.adresse || 'Adresse non spécifiée'}, ${propertyInfo.surface_habitable || 'N/A'}m², ${propertyInfo.nombre_pieces || 'N/A'} pièces
Prix demandé : ${propertyInfo.prix_demande ? propertyInfo.prix_demande.toLocaleString('fr-FR') + '€' : 'Non spécifié'}
Offre proposée : ${selectedScenario.montant ? selectedScenario.montant.toLocaleString('fr-FR') + '€' : 'Non spécifié'}

${marketAnalysis ? `
Analyse de marché :
- Prix moyen du marché : ${marketAnalysis.valeur_estimee_mediane ? marketAnalysis.valeur_estimee_mediane.toLocaleString('fr-FR') + '€/m²' : 'Non disponible'}
- Source des données : ${marketAnalysis.source === 'DVF' ? 'Données officielles DVF' : 'Estimation IA'}
- ${marketAnalysis.transactions_similaires ? marketAnalysis.transactions_similaires.length + ' transactions similaires analysées' : 'Aucune transaction similaire'}
` : ''}

${chatgptAnalysis ? `
Analyse experte :
- Points forts : ${chatgptAnalysis.points_forts || 'Non spécifiés'}
- Points d'attention : ${chatgptAnalysis.points_attention || 'Non spécifiés'}
- Recommandations : ${chatgptAnalysis.recommandations || 'Non spécifiées'}
` : ''}

Stratégie : ${selectedScenario.strategie}
Clauses suspensives : ${selectedScenario.clauses ? selectedScenario.clauses.join(', ') : 'Aucune'}
Délai de réponse : ${selectedScenario.delai_reponse || 72} heures
Probabilité d'acceptation : ${selectedScenario.probabilite_acceptation || 0}%

Le texte doit être :
- Courtois et professionnel
- Argumenté avec les données de marché
- Structuré comme une vraie offre d'achat
- Inclure une introduction personnalisée
- Justifier le montant proposé
- Mentionner les clauses suspensives
- Se terminer par une formule de politesse appropriée

Format de réponse : Texte brut, sans formatage markdown, prêt à être copié-collé.`

    // Appeler OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en négociation immobilière spécialisé dans la rédaction d\'offres d\'achat professionnelles et convaincantes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error('OpenAI API error:', errorData)
      
      if (openaiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'RATE_LIMIT' }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      if (openaiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'INSUFFICIENT_CREDITS' }),
          { 
            status: 402, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      throw new Error(`OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    const offerTemplate = openaiData.choices?.[0]?.message?.content

    if (!offerTemplate) {
      throw new Error('Aucun contenu généré par OpenAI')
    }

    return new Response(
      JSON.stringify({ 
        offerTemplate,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in generate-offer-template:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
