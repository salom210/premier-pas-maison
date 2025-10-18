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
- Prix moyen/m² dans le quartier : ${marketAnalysis.prix_moyen_m2_quartier?.toLocaleString() || 'N/A'} €
- Fourchette marché : ${marketAnalysis.valeur_estimee_basse?.toLocaleString()} - ${marketAnalysis.valeur_estimee_haute?.toLocaleString()} €
- Valeur médiane estimée : ${marketAnalysis.valeur_estimee_mediane?.toLocaleString()} €
- Nombre transactions similaires : ${marketAnalysis.nombre_transactions_similaires || 0}
- Source des données : ${marketAnalysis.source || 'N/A'}
` : ''}

IMPORTANT : Dans ton analyse, PRÉCISE OBLIGATOIREMENT :
1. La date approximative des données de marché que tu utilises (format : "MM/YYYY")
2. Si les données sont récentes (< 6 mois), moyennes (6-12 mois) ou anciennes (> 12 mois)

Analyse précisément ce bien et fournis ton expertise.`;

    const systemPrompt = `Tu es un expert en immobilier français spécialisé dans l'analyse de marché. 
Tu as accès à des données actualisées de sites comme SeLoger, PAP, LeBonCoin, MeilleursAgents.

Ton rôle :
1. Analyser si le bien décrit est sous-coté, sur-coté ou au prix du marché
2. Estimer l'écart en % par rapport au prix juste
3. Identifier les points forts et faibles du bien
4. Fournir une recommandation d'action claire pour l'acheteur
5. Suggérer une marge de négociation réaliste

Contexte : L'utilisateur souhaite acheter ce bien et a besoin d'une analyse objective.

Réponds UNIQUEMENT en JSON valide suivant exactement cette structure :
{
  "conclusion": "sous-cote" | "correct" | "sur-cote",
  "ecart_estime": number (% positif si survalorisé, négatif si sous-coté),
  "prix_juste_estime": number (en euros),
  "marge_negociation": number (% de réduction suggérée),
  "analyse_qualitative": "string (max 300 caractères)",
  "points_forts": ["string", "string", ...] (2-4 points),
  "points_faibles": ["string", "string", ...] (2-4 points),
  "recommandation": "string (max 200 caractères)",
  "confiance": "faible" | "moyenne" | "élevée",
  "sources_comparaison": "string (explique quelles sources tu as utilisées)",
  "date_donnees_marche": "MM/YYYY",
  "fraicheur_donnees": "récente" | "moyenne" | "ancienne"
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
    const content = data.choices[0].message.content;
    console.log('Lovable AI response:', content);

    const analysis = JSON.parse(content);
    
    // Validation de la structure
    if (!analysis.conclusion || !analysis.ecart_estime || !analysis.prix_juste_estime || 
        !analysis.marge_negociation || !analysis.analyse_qualitative || 
        !analysis.points_forts || !analysis.points_faibles || 
        !analysis.recommandation || !analysis.confiance || 
        !analysis.sources_comparaison || !analysis.date_donnees_marche || 
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
