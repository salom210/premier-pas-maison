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
    const { codePostal, ville, surface, nombrePieces } = await req.json();

    console.log('Fetching market data for:', { codePostal, ville, surface, nombrePieces });

    // Appel à l'API DVF (données publiques)
    const dvfUrl = `https://app.dvf.etalab.gouv.fr/api/transactions?code_postal=${codePostal}&type_local=Appartement&nature_mutation=Vente`;
    
    const response = await fetch(dvfUrl, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`DVF API error: ${response.status}`);
    }

    const transactions = await response.json();
    console.log(`Found ${transactions.results?.length || 0} transactions`);

    // Filtrer les transactions similaires (±20m², ±1 pièce)
    const similar = (transactions.results || []).filter((t: any) => 
      t.surface_relle_bati &&
      t.nombre_pieces_principales &&
      Math.abs(t.surface_relle_bati - surface) < 20 &&
      Math.abs(t.nombre_pieces_principales - nombrePieces) <= 1
    );

    console.log(`Filtered to ${similar.length} similar transactions`);

    if (similar.length === 0) {
      // Pas assez de données, retourner des estimations basiques
      const prixMoyenM2 = 3500; // Valeur par défaut
      return new Response(JSON.stringify({
        prix_moyen_m2_ville: prixMoyenM2,
        prix_moyen_m2_quartier: prixMoyenM2,
        prix_min_m2: prixMoyenM2 * 0.8,
        prix_max_m2: prixMoyenM2 * 1.2,
        nombre_transactions_similaires: 0,
        valeur_estimee_basse: surface * prixMoyenM2 * 0.85,
        valeur_estimee_haute: surface * prixMoyenM2 * 1.15,
        valeur_estimee_mediane: surface * prixMoyenM2,
        ecart_prix_demande_vs_marche: 0,
        conclusion: 'correct',
        derniere_maj: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Calculer les prix au m²
    const prixM2Array = similar.map((t: any) => t.valeur_fonciere / t.surface_relle_bati);
    prixM2Array.sort((a: number, b: number) => a - b);

    const prixMoyenM2 = prixM2Array.reduce((a: number, b: number) => a + b, 0) / prixM2Array.length;
    const prixMinM2 = prixM2Array[0];
    const prixMaxM2 = prixM2Array[prixM2Array.length - 1];
    const prixMedianM2 = prixM2Array[Math.floor(prixM2Array.length / 2)];

    // Estimations de valeur
    const valeurEstimeeBasse = surface * prixMinM2;
    const valeurEstimeeHaute = surface * prixMaxM2;
    const valeurEstimeeMediane = surface * prixMedianM2;

    const marketAnalysis = {
      prix_moyen_m2_ville: Math.round(prixMoyenM2),
      prix_moyen_m2_quartier: Math.round(prixMedianM2),
      prix_min_m2: Math.round(prixMinM2),
      prix_max_m2: Math.round(prixMaxM2),
      nombre_transactions_similaires: similar.length,
      valeur_estimee_basse: Math.round(valeurEstimeeBasse),
      valeur_estimee_haute: Math.round(valeurEstimeeHaute),
      valeur_estimee_mediane: Math.round(valeurEstimeeMediane),
      ecart_prix_demande_vs_marche: 0,
      conclusion: 'correct' as const,
      derniere_maj: new Date().toISOString()
    };

    console.log('Market analysis completed:', marketAnalysis);

    return new Response(JSON.stringify(marketAnalysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in dvf-market-data:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
