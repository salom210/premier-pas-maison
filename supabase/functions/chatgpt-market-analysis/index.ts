import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyInfo, marketAnalysis } = await req.json();
    console.log('ChatGPT Market Analysis request:', { propertyInfo, marketAnalysis });

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Construire le prompt utilisateur
    const userPrompt = `Analyse ce bien immobilier :

LOCALISATION :
- Adresse : ${propertyInfo.adresse}
- Code postal : ${propertyInfo.code_postal}
- Ville : ${propertyInfo.ville}

CARACTÉRISTIQUES :
- Surface habitable : ${propertyInfo.surface_habitable} m²
- Nombre de pièces : ${propertyInfo.nombre_pieces}
- Nombre de chambres : ${propertyInfo.nombre_chambres || 'Non renseigné'}
${propertyInfo.etage ? `- Étage : ${propertyInfo.etage}${propertyInfo.dernier_etage ? ' (dernier étage)' : ''}` : ''}
- Ascenseur : ${propertyInfo.ascenseur ? 'Oui' : 'Non'}
- Balcon/Terrasse : ${propertyInfo.balcon_terrasse ? 'Oui' : 'Non'}${propertyInfo.surface_exterieure ? ` (${propertyInfo.surface_exterieure} m²)` : ''}
- Parking : ${propertyInfo.parking ? 'Oui' : 'Non'}
- Cave : ${propertyInfo.cave ? 'Oui' : 'Non'}
- État : ${propertyInfo.etat}
${propertyInfo.annee_construction ? `- Année construction : ${propertyInfo.annee_construction}` : ''}
${propertyInfo.dpe ? `- DPE : ${propertyInfo.dpe}` : ''}

FINANCIER :
- Prix demandé : ${propertyInfo.prix_demande.toLocaleString()} €
- Prix/m² demandé : ${Math.round(propertyInfo.prix_demande / propertyInfo.surface_habitable).toLocaleString()} €/m²
${propertyInfo.charges_trimestrielles ? `- Charges trimestrielles : ${propertyInfo.charges_trimestrielles} €` : ''}
${propertyInfo.taxe_fonciere ? `- Taxe foncière annuelle : ${propertyInfo.taxe_fonciere} €` : ''}

${marketAnalysis ? `
DONNÉES MARCHÉ EXISTANTES :
- Source : ${marketAnalysis.source} ${marketAnalysis.source === 'DVF' ? '(transactions notariales officielles)' : marketAnalysis.source === 'Hybride' ? '(DVF + estimations IA)' : ''}
- Prix moyen/m² dans le quartier : ${marketAnalysis.prix_moyen_m2_quartier?.toLocaleString() || 'N/A'} €
- Fourchette marché : ${marketAnalysis.valeur_estimee_basse?.toLocaleString()} - ${marketAnalysis.valeur_estimee_haute?.toLocaleString()} €
- Valeur médiane estimée : ${marketAnalysis.valeur_estimee_mediane?.toLocaleString()} €
- Nombre transactions similaires : ${marketAnalysis.nombre_transactions_similaires || 0}
${marketAnalysis.transactions_similaires && marketAnalysis.transactions_similaires.length > 0 ? `
- Exemples de transactions récentes :
${marketAnalysis.transactions_similaires.slice(0, 3).map((t: any) => 
  `  • ${t.adresse || 'Adresse non communiquée'} - ${t.prix_vente.toLocaleString()}€ - ${t.surface}m² - ${t.nombre_pieces} pièces - ${t.date_vente}`
).join('\n')}
` : ''}
` : ''}

IMPORTANT : Dans ton analyse, PRÉCISE OBLIGATOIREMENT :
1. La date approximative des données de marché que tu utilises (format : "MM/YYYY")
2. Si les données sont récentes (< 6 mois), moyennes (6-12 mois) ou anciennes (> 12 mois)

Analyse précisément ce bien et fournis ton expertise.`;

    const systemPrompt = `Tu es un expert en immobilier français spécialisé dans l'analyse de marché. 
Tu as accès à des données de plusieurs sources :
- API DVF (Demandes de Valeurs Foncières) : données officielles des transactions notariales (délai de publication : 6 mois)
- Sites d'annonces : SeLoger, PAP, LeBonCoin, MeilleursAgents

IMPORTANT sur la fraîcheur des données DVF :
- Les données DVF officielles ont un délai de publication de 6 mois (c'est NORMAL pour les données notariales)
- Une donnée DVF de 6-12 mois est considérée comme "moyenne" ou "récente" (c'est le cycle normal)
- Ne pénalise PAS les données DVF pour ce délai, c'est inhérent au système officiel français

Ton rôle :
1. Analyser si le bien décrit est sous-coté, sur-coté ou au prix du marché
2. Estimer l'écart en % par rapport au prix juste
3. Identifier les points forts et faibles du bien
4. Fournir une recommandation d'action claire pour l'acheteur
5. Suggérer une marge de négociation réaliste

Contexte : L'utilisateur souhaite acheter ce bien et a besoin d'une analyse objective.

Pour "fraicheur_donnees", utilise cette logique :
- "récente" : données DVF de moins de 6 mois OU données d'annonces de moins de 3 mois
- "moyenne" : données DVF de 6-12 mois OU données d'annonces de 3-9 mois  
- "ancienne" : données de plus de 12 mois

Réponds UNIQUEMENT en JSON valide (sans balises de code markdown) suivant exactement cette structure :
{
  "conclusion": "sous-cote" ou "correct" ou "sur-cote",
  "ecart_estime": number,
  "prix_juste_estime": number,
  "marge_negociation": number,
  "analyse_qualitative": "string",
  "points_forts": ["string", "string"],
  "points_faibles": ["string", "string"],
  "recommandation": "string",
  "confiance": "faible" ou "moyenne" ou "élevée",
  "sources_comparaison": "string",
  "date_donnees_marche": "MM/YYYY",
  "fraicheur_donnees": "récente" ou "moyenne" ou "ancienne"
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit atteint. Veuillez réessayer dans quelques instants.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits Lovable AI insuffisants. Ajoutez des crédits dans Settings > Workspace > Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content as string;
    console.log('Lovable AI response:', content);

    // Nettoyer le contenu (retirer les balises ```json si présentes)
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      // Retirer ```json ou ``` en début et ``` en fin
      cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trim();
    }

    // Parser le JSON
    let analysis;
    try {
      analysis = JSON.parse(cleaned);
    } catch (parseError) {
      // Tentative de récupération: extraire entre { et }
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          analysis = JSON.parse(cleaned.slice(start, end + 1));
        } catch {
          throw new Error('Invalid JSON format from Lovable AI');
        }
      } else {
        throw new Error('Invalid JSON format from Lovable AI');
      }
    }
    
    // Validation de la structure (vérifier présence et type, pas "truthy")
    if (!analysis.conclusion || 
        !('ecart_estime' in analysis && typeof analysis.ecart_estime === 'number') || 
        !('prix_juste_estime' in analysis && typeof analysis.prix_juste_estime === 'number') || 
        !('marge_negociation' in analysis && typeof analysis.marge_negociation === 'number') || 
        !analysis.analyse_qualitative || 
        !Array.isArray(analysis.points_forts) || 
        !Array.isArray(analysis.points_faibles) || 
        !analysis.recommandation || 
        !analysis.confiance || 
        !analysis.sources_comparaison || 
        !analysis.date_donnees_marche || 
        !analysis.fraicheur_donnees) {
      throw new Error('Invalid response structure from Lovable AI');
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chatgpt-market-analysis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
