import { supabase } from "@/integrations/supabase/client";
import type { MarketAnalysis } from "@/types/project";

export async function fetchMarketData(
  codePostal: string,
  ville: string,
  surface: number,
  nombrePieces: number,
  useAI = true, // Toujours utiliser l'IA maintenant
  additionalInfo?: {
    etage?: number;
    dernier_etage?: boolean;
    annee_construction?: number;
    etat?: string;
    charges_trimestrielles?: number;
    prix_demande?: number;
  }
): Promise<MarketAnalysis | null> {
  // Utiliser exclusivement l'IA pour l'estimation de marché
  return await fetchAIMarketData(codePostal, ville, surface, nombrePieces, additionalInfo);
}

async function fetchAIMarketData(
  codePostal: string,
  ville: string,
  surface: number,
  nombrePieces: number,
  additionalInfo?: {
    etage?: number;
    dernier_etage?: boolean;
    annee_construction?: number;
    etat?: string;
    charges_trimestrielles?: number;
    prix_demande?: number;
  }
): Promise<MarketAnalysis | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-market-estimate', {
      body: {
        codePostal,
        ville,
        surface,
        nombrePieces,
        ...additionalInfo
      }
    });

    if (error) {
      console.error('Error fetching AI market data:', error);
      return null;
    }

    // Normaliser la réponse de l'IA pour correspondre à MarketAnalysis
    const prixMoyenM2 = data.prix_moyen_m2 || data.prix_moyen_m2_quartier || Math.round(data.valeur_estimee_mediane / surface);
    
    // Map transactions similaires si elles existent
    const transactionsSimilaires = data.transactions_similaires?.map((t: any, index: number) => ({
      id: t.id || `transaction_${index}`,
      adresse: t.adresse,
      prix_vente: t.prix_vente,
      surface: t.surface,
      nombre_pieces: t.nombre_pieces,
      date_vente: t.date_vente,
      distance_km: t.distance_km
    }));

    const normalized: MarketAnalysis = {
      prix_moyen_m2_quartier: prixMoyenM2,
      prix_moyen_m2_ville: data.prix_moyen_m2_ville || prixMoyenM2,
      prix_min_m2: data.prix_min_m2 || Math.round(data.valeur_estimee_basse / surface),
      prix_max_m2: data.prix_max_m2 || Math.round(data.valeur_estimee_haute / surface),
      valeur_estimee_basse: Math.round(data.valeur_estimee_basse),
      valeur_estimee_mediane: Math.round(data.valeur_estimee_mediane),
      valeur_estimee_haute: Math.round(data.valeur_estimee_haute),
      nombre_transactions_similaires: data.nombre_transactions || 0,
      ecart_prix_demande_vs_marche: data.ecart_prix_demande_vs_marche || 0,
      conclusion: data.conclusion || 'correct',
      source: 'IA',
      derniere_maj: new Date().toISOString(),
      transactions_similaires: transactionsSimilaires
    };

    return normalized;
  } catch (error) {
    console.error('Exception fetching AI market data:', error);
    return null;
  }
}

export async function fetchChatGPTAnalysis(
  propertyInfo: any,
  marketAnalysis: MarketAnalysis | null
): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('chatgpt-market-analysis', {
      body: {
        propertyInfo,
        marketAnalysis
      }
    });

    if (error) {
      console.error('Error fetching AI analysis:', error);
      
      // Gestion spécifique des erreurs 429 et 402
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        throw new Error('RATE_LIMIT');
      }
      if (error.message?.includes('402') || error.message?.includes('insuffisants') || error.message?.includes('credits')) {
        throw new Error('INSUFFICIENT_CREDITS');
      }
      
      return null;
    }

    // Vérifier si data contient une erreur
    if (data?.error) {
      console.error('AI analysis returned error:', data.error);
      
      if (data.error.includes('Rate limit') || data.error.includes('429')) {
        throw new Error('RATE_LIMIT');
      }
      if (data.error.includes('Crédits') || data.error.includes('402')) {
        throw new Error('INSUFFICIENT_CREDITS');
      }
      
      return null;
    }

    return { ...data, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('Exception fetching AI analysis:', error);
    
    // Re-throw les erreurs spécifiques pour que le composant puisse les gérer
    if (error instanceof Error && (error.message === 'RATE_LIMIT' || error.message === 'INSUFFICIENT_CREDITS')) {
      throw error;
    }
    
    return null;
  }
}

export function calculateFiabilite(
  chatgptAnalysis: any,
  marketAnalysis: MarketAnalysis | null,
  propertyInfo: any
): any {
  let score = 0;
  const criteres: any = {};
  const recommandations: string[] = [];

  // 1. Ancienneté des données (30 points max)
  let scoreAnciennete = 10;
  let moisDepuisMAJ = 12;
  let detailAnciennete = 'Données non datées';
  
  if (chatgptAnalysis.date_donnees_marche) {
    const [month, year] = chatgptAnalysis.date_donnees_marche.split('/');
    const dateMAJ = new Date(parseInt('20' + year), parseInt(month) - 1);
    const now = new Date();
    moisDepuisMAJ = Math.floor((now.getTime() - dateMAJ.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (moisDepuisMAJ < 6) {
      scoreAnciennete = 30;
      detailAnciennete = `Données récentes (${moisDepuisMAJ} mois)`;
    } else if (moisDepuisMAJ < 12) {
      scoreAnciennete = 20;
      detailAnciennete = `Données moyennes (${moisDepuisMAJ} mois)`;
      recommandations.push('Les données ont entre 6 et 12 mois. Une actualisation serait bénéfique.');
    } else {
      scoreAnciennete = 10;
      detailAnciennete = `Données anciennes (${moisDepuisMAJ} mois)`;
      recommandations.push('Les données ont plus d\'un an. Recommandé de vérifier les prix actuels du marché.');
    }
  }
  
  criteres.anciennete_donnees = {
    score: scoreAnciennete,
    detail: detailAnciennete,
    warning: moisDepuisMAJ > 6
  };
  score += scoreAnciennete;

  // 2. Complétude du bien (25 points max)
  const champsImportants = [
    'adresse', 'code_postal', 'ville', 'surface_habitable', 'nombre_pieces',
    'nombre_chambres', 'etat', 'prix_demande', 'etage', 'annee_construction',
    'dpe', 'charges_trimestrielles', 'taxe_fonciere'
  ];
  const champsRemplis = champsImportants.filter(champ => 
    propertyInfo[champ] !== null && 
    propertyInfo[champ] !== undefined && 
    propertyInfo[champ] !== ''
  ).length;
  const completude = (champsRemplis / champsImportants.length) * 100;
  
  let scoreCompletude = 5;
  if (completude > 80) scoreCompletude = 25;
  else if (completude > 60) scoreCompletude = 15;
  else recommandations.push('Complétez les informations du bien pour une analyse plus précise.');
  
  criteres.completude_bien = {
    score: scoreCompletude,
    detail: `${champsRemplis}/${champsImportants.length} champs renseignés (${Math.round(completude)}%)`,
    warning: completude < 60
  };
  score += scoreCompletude;

  // 3. Confiance IA (25 points max)
  let scoreConfiance = 5;
  if (chatgptAnalysis.confiance === 'élevée') scoreConfiance = 25;
  else if (chatgptAnalysis.confiance === 'moyenne') scoreConfiance = 15;
  else recommandations.push('L\'IA a une confiance limitée. Croiser avec d\'autres sources.');
  
  criteres.confiance_ia = {
    score: scoreConfiance,
    detail: `Niveau: ${chatgptAnalysis.confiance}`,
    warning: chatgptAnalysis.confiance === 'faible'
  };
  score += scoreConfiance;

  // 4. Transactions comparables (20 points max)
  const nbTransactions = marketAnalysis?.nombre_transactions_similaires || 0;
  let scoreTransactions = 5;
  if (nbTransactions > 20) scoreTransactions = 20;
  else if (nbTransactions > 10) scoreTransactions = 15;
  else if (nbTransactions > 0) scoreTransactions = 10;
  else recommandations.push('Peu de transactions comparables trouvées. Prudence sur l\'estimation.');
  
  criteres.transactions_comparables = {
    score: scoreTransactions,
    detail: `${nbTransactions} biens similaires`,
    warning: nbTransactions < 10
  };
  score += scoreTransactions;

  // Déterminer le niveau
  let niveau: 'élevée' | 'moyenne' | 'faible';
  if (score >= 75) niveau = 'élevée';
  else if (score >= 50) niveau = 'moyenne';
  else niveau = 'faible';

  if (score < 60) {
    recommandations.push('Fiabilité limitée : complétez les informations et vérifiez avec d\'autres sources.');
  }

  return {
    score,
    niveau,
    criteres,
    recommandations
  };
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
