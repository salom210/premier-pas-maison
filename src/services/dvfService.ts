import { supabase } from "@/integrations/supabase/client";
import type { MarketAnalysis } from "@/types/project";

export async function fetchMarketData(
  codePostal: string,
  ville: string,
  surface: number,
  nombrePieces: number
): Promise<MarketAnalysis | null> {
  try {
    const { data, error } = await supabase.functions.invoke('dvf-market-data', {
      body: {
        codePostal,
        ville,
        surface,
        nombrePieces
      }
    });

    if (error) {
      console.error('Error fetching market data:', error);
      return null;
    }

    return data as MarketAnalysis;
  } catch (error) {
    console.error('Exception fetching market data:', error);
    return null;
  }
}

export function calculerProbabiliteAcceptation(
  montant_offre: number,
  prix_demande: number,
  valeur_marche: number,
  nb_clauses: number,
  delai_reponse: number,
  contexte_marche: 'vendeur' | 'acheteur' | 'equilibre' = 'equilibre'
): number {
  let probabilite = 50;

  // Écart par rapport au prix demandé
  const ecart = (prix_demande - montant_offre) / prix_demande;
  if (ecart < 0.05) probabilite += 30;
  else if (ecart < 0.10) probabilite += 10;
  else if (ecart > 0.15) probabilite -= 20;

  // Position par rapport au marché
  if (montant_offre >= valeur_marche * 0.98) probabilite += 15;
  else if (montant_offre < valeur_marche * 0.90) probabilite -= 15;

  // Nombre de clauses (moins = mieux)
  probabilite -= nb_clauses * 3;

  // Délai de réponse (rapide = mieux)
  if (delai_reponse <= 48) probabilite += 5;

  // Contexte marché
  if (contexte_marche === 'acheteur') probabilite += 10;
  else if (contexte_marche === 'vendeur') probabilite -= 10;

  return Math.max(0, Math.min(100, Math.round(probabilite)));
}
