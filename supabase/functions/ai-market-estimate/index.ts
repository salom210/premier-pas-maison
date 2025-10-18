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
    const { codePostal, ville, surface, nombrePieces, etage, dernier_etage, annee_construction, etat, charges_trimestrielles, prix_demande } = await req.json();
    
    console.log('AI Market Estimate request:', { codePostal, ville, surface, nombrePieces });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Tu es un expert en estimation immobilière en France. 
    
Estime la valeur de marché d'un appartement avec ces caractéristiques :
- Code postal : ${codePostal}
- Ville : ${ville}
- Surface : ${surface} m²
- Nombre de pièces : ${nombrePieces}
${etage !== undefined ? `- Étage : ${etage}` : ''}
${dernier_etage !== undefined ? `- Dernier étage : ${dernier_etage ? 'Oui' : 'Non'}` : ''}
${annee_construction !== undefined ? `- Année de construction : ${annee_construction}` : ''}
${etat !== undefined ? `- État : ${etat}` : ''}
${charges_trimestrielles !== undefined ? `- Charges trimestrielles : ${charges_trimestrielles}€` : ''}
${prix_demande !== undefined ? `- Prix demandé : ${prix_demande}€` : ''}

Fournis une estimation de marché structurée en JSON avec les clés suivantes :
- prix_moyen_m2_ville : prix moyen au m² dans cette ville (nombre)
- prix_moyen_m2_quartier : prix moyen au m² dans ce secteur/code postal (nombre)
- valeur_basse : estimation basse de la valeur totale du bien (nombre)
- valeur_mediane : estimation médiane de la valeur totale du bien (nombre)
- valeur_haute : estimation haute de la valeur totale du bien (nombre)
- nombre_transactions : estimation du nombre de transactions similaires récentes dans la zone (nombre approximatif)
- justification : brève justification de l'estimation (texte, max 200 caractères)
- transactions_similaires : tableau de 3 à 5 biens similaires vendus récemment avec :
  * id : identifiant unique (string)
  * adresse : adresse approximative ou quartier (string, optionnel)
  * prix_vente : prix de vente (nombre)
  * surface : surface en m² (nombre)
  * nombre_pieces : nombre de pièces (nombre)
  * date_vente : date de vente au format ISO (string, ex: "2024-09-15")
  * distance_km : distance approximative du bien analysé en km (nombre, optionnel)

Réponds UNIQUEMENT avec le JSON valide, sans texte avant ou après.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(JSON.stringify({ 
          error: "Limite de requêtes dépassée, veuillez réessayer plus tard." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(JSON.stringify({ 
          error: "Crédits insuffisants pour l'analyse IA." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log('AI response content:', content);

    // Parse JSON from AI response
    let estimation;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      estimation = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Fallback avec valeurs par défaut basées sur moyennes nationales
      const prixM2Moyen = 3500;
      const valeurMediane = surface * prixM2Moyen;
      estimation = {
        prix_moyen_m2_ville: prixM2Moyen,
        prix_moyen_m2_quartier: prixM2Moyen,
        valeur_basse: Math.round(valeurMediane * 0.85),
        valeur_mediane: Math.round(valeurMediane),
        valeur_haute: Math.round(valeurMediane * 1.15),
        nombre_transactions: 10,
        justification: "Estimation par défaut basée sur moyennes nationales"
      };
    }

    // Ensure values are consistent (min <= median <= max)
    if (estimation.valeur_basse > estimation.valeur_mediane) {
      [estimation.valeur_basse, estimation.valeur_mediane] = [estimation.valeur_mediane, estimation.valeur_basse];
    }
    if (estimation.valeur_mediane > estimation.valeur_haute) {
      [estimation.valeur_mediane, estimation.valeur_haute] = [estimation.valeur_haute, estimation.valeur_mediane];
    }

    const result = {
      prix_moyen_m2: Math.round(estimation.prix_moyen_m2_quartier || estimation.prix_moyen_m2_ville),
      valeur_estimee_basse: Math.round(estimation.valeur_basse),
      valeur_estimee_mediane: Math.round(estimation.valeur_mediane),
      valeur_estimee_haute: Math.round(estimation.valeur_haute),
      nombre_transactions: estimation.nombre_transactions || 0,
      source: 'IA',
      justification: estimation.justification
    };

    console.log('Returning AI estimation:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-market-estimate:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
