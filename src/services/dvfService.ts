import { supabase } from "@/integrations/supabase/client";
import type { MarketAnalysis, PropertyInfo, ChatGPTAnalysis, OffreScenario } from "@/types/project";
import { analyzeDVFMarket } from "@/lib/dvf/marketAnalysisService";
import { loadDVFData } from "@/lib/dvf/dvfLoader";

export async function fetchMarketData(
  codePostal: string,
  ville: string,
  surface: number,
  nombrePieces: number,
  useAI = true,
  additionalInfo?: {
    etage?: number;
    dernier_etage?: boolean;
    annee_construction?: number;
    etat?: string;
    charges_trimestrielles?: number;
    prix_demande?: number;
  }
): Promise<MarketAnalysis | null> {
  // Essayer d'abord les données DVF locales pour le département 93
  const departement = codePostal.substring(0, 2);
  if (departement === '93') {
    try {
      console.log('Tentative de chargement des données DVF locales pour le département 93');
      const dvfData = await loadDVFData();
      
      if (dvfData && dvfData.length > 0) {
        console.log(`Données DVF chargées: ${dvfData.length} transactions`);
        const analysis = analyzeDVFMarket(dvfData, {
          codePostal,
          ville,
          surface,
          nombrePieces,
          additionalInfo
        });
        
        if (analysis) {
          console.log('Analyse DVF réussie, utilisation des données locales');
          return analysis;
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données DVF:', error);
    }
  }
  
  // Fallback vers l'IA si pas de données DVF ou département différent
  console.log('Fallback vers l\'analyse IA');
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

    // Générer des statistiques par nombre de pièces même pour l'IA
    const statistiquesPieces = generateBasicRoomStatistics(nombrePieces, prixMoyenM2, data.nombre_transactions || 0);

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
      transactions_similaires: transactionsSimilaires,
      statistiques_pieces: statistiquesPieces
    };

    return normalized;
  } catch (error) {
    console.error('Exception fetching AI market data:', error);
    return null;
  }
}

export async function fetchChatGPTAnalysis(
  propertyInfo: any,
  marketAnalysis: MarketAnalysis | null,
  prixReferenceM2?: number
): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('chatgpt-market-analysis', {
      body: {
        propertyInfo,
        marketAnalysis,
        prix_reference_m2: prixReferenceM2
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

  // 1. Fraîcheur des données (30 points max)
  let scoreAnciennete = 5;
  let detailAnciennete = 'Source de données inconnue';
  
  // Priorité aux données DVF réelles
  if (marketAnalysis?.source === 'DVF') {
    if (marketAnalysis.dataSource === '2025') {
      scoreAnciennete = 30;
      detailAnciennete = 'Données officielles DVF 2025 - Prix de vente réels les plus récents (source la plus fiable)';
    } else if (marketAnalysis.dataSource === '2024') {
      scoreAnciennete = 25;
      detailAnciennete = 'Données officielles DVF 2024 - Prix de vente réels récents (très fiable)';
      recommandations.push('Données DVF 2024 disponibles. Les données 2025 seraient plus récentes.');
    } else if (marketAnalysis.dataSource?.includes('2024') && marketAnalysis.dataSource?.includes('2025')) {
      scoreAnciennete = 28;
      detailAnciennete = 'Données officielles DVF 2024-2025 - Prix de vente réels combinés (très fiable)';
    } else {
      scoreAnciennete = 20;
      detailAnciennete = 'Données officielles DVF - Prix de vente réels (fiable)';
    }
  } else if (marketAnalysis?.source === 'IA') {
    // Données générées par l'IA
    scoreAnciennete = 10;
    detailAnciennete = 'Estimation IA - Calculée par intelligence artificielle (moins fiable que les données réelles)';
    recommandations.push('Données estimées par IA. Les données DVF réelles seraient plus fiables.');
  } else if (chatgptAnalysis?.date_donnees_marche) {
    // Fallback sur l'ancien système de date
    try {
      const [month, year] = chatgptAnalysis.date_donnees_marche.split('/');
      const fullYear = parseInt('20' + year);
      const monthNum = parseInt(month);
      
      // Validation des données de date
      if (isNaN(fullYear) || isNaN(monthNum) || monthNum < 1 || monthNum > 12 || fullYear < 2020 || fullYear > 2030) {
        throw new Error('Date invalide');
      }
      
      const dateMAJ = new Date(fullYear, monthNum - 1);
      const now = new Date();
      const moisDepuisMAJ = Math.floor((now.getTime() - dateMAJ.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      // Validation du résultat du calcul
      if (isNaN(moisDepuisMAJ) || moisDepuisMAJ < 0 || moisDepuisMAJ > 120) {
        throw new Error('Calcul de date invalide');
      }
      
      if (moisDepuisMAJ < 6) {
        scoreAnciennete = 20;
        detailAnciennete = `Données récentes - Mises à jour il y a ${moisDepuisMAJ} mois (source non spécifiée)`;
      } else if (moisDepuisMAJ < 12) {
        scoreAnciennete = 15;
        detailAnciennete = `Données moyennes - Mises à jour il y a ${moisDepuisMAJ} mois (source non spécifiée)`;
        recommandations.push('Les données ont entre 6 et 12 mois. Une actualisation serait bénéfique.');
      } else {
        scoreAnciennete = 10;
        detailAnciennete = `Données anciennes - Mises à jour il y a ${moisDepuisMAJ} mois (source non spécifiée)`;
        recommandations.push('Les données ont plus d\'un an. Recommandé de vérifier les prix actuels du marché.');
      }
    } catch (error) {
      // En cas d'erreur de parsing de date, utiliser un score par défaut
      console.warn('Erreur de parsing de date:', error);
      scoreAnciennete = 5;
      detailAnciennete = 'Date de mise à jour invalide - Impossible de calculer la fraîcheur des données';
      recommandations.push('Format de date incorrect. Impossible de déterminer la fraîcheur des données.');
    }
  } else {
    scoreAnciennete = 5;
    detailAnciennete = 'Source inconnue - Impossible de vérifier la fraîcheur des données';
    recommandations.push('Aucune information sur la source des données. Fiabilité limitée.');
  }
  
  criteres.anciennete_donnees = {
    score: scoreAnciennete,
    detail: detailAnciennete,
    warning: scoreAnciennete < 20
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

export async function generateOfferTemplate(
  propertyInfo: PropertyInfo,
  marketAnalysis: MarketAnalysis,
  chatgptAnalysis: ChatGPTAnalysis,
  scenario: OffreScenario
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('chatgpt-market-analysis', {
      body: {
        type: 'generate_offer_template',
        propertyInfo,
        marketAnalysis,
        chatgptAnalysis,
        scenario
      }
    });

    if (error) {
      console.error('Error generating offer template:', error);
      
      if (error.message?.includes('rate limit')) {
        throw new Error('RATE_LIMIT');
      } else if (error.message?.includes('credits')) {
        throw new Error('INSUFFICIENT_CREDITS');
      } else {
        throw new Error(error.message || 'Failed to generate offer template');
      }
    }

    return data?.template || 'Erreur lors de la génération du modèle d\'offre.';
  } catch (error) {
    console.error('Error in generateOfferTemplate:', error);
    throw error;
  }
}

// Fonction pour générer des statistiques par nombre de pièces basiques pour l'IA
function generateBasicRoomStatistics(
  nombrePieces: number,
  prixMoyenM2: number,
  nombreTransactions: number
) {
  // Générer des groupes de pièces autour du nombre cible
  const groupesPieces = [];
  
  // Groupe exact
  groupesPieces.push({
    nombre_pieces: nombrePieces,
    nombre_transactions: Math.max(1, Math.floor(nombreTransactions * 0.4)),
    prix_moyen_m2: prixMoyenM2,
    prix_min_m2: Math.round(prixMoyenM2 * 0.85),
    prix_max_m2: Math.round(prixMoyenM2 * 1.15),
    ecart_avec_cible: 0,
    priorite: 'exacte' as const
  });
  
  // Groupe proche (±1 pièce)
  if (nombrePieces > 1) {
    groupesPieces.push({
      nombre_pieces: nombrePieces - 1,
      nombre_transactions: Math.max(1, Math.floor(nombreTransactions * 0.3)),
      prix_moyen_m2: Math.round(prixMoyenM2 * 0.95),
      prix_min_m2: Math.round(prixMoyenM2 * 0.8),
      prix_max_m2: Math.round(prixMoyenM2 * 1.1),
      ecart_avec_cible: 1,
      priorite: 'proche' as const
    });
  }
  
  groupesPieces.push({
    nombre_pieces: nombrePieces + 1,
    nombre_transactions: Math.max(1, Math.floor(nombreTransactions * 0.3)),
    prix_moyen_m2: Math.round(prixMoyenM2 * 1.05),
    prix_min_m2: Math.round(prixMoyenM2 * 0.9),
    prix_max_m2: Math.round(prixMoyenM2 * 1.2),
    ecart_avec_cible: 1,
    priorite: 'proche' as const
  });
  
  return {
    cible_pieces: nombrePieces,
    total_transactions: nombreTransactions,
    correspondance_exacte: Math.max(1, Math.floor(nombreTransactions * 0.4)),
    correspondance_proche: Math.max(1, Math.floor(nombreTransactions * 0.6)),
    groupes_pieces: groupesPieces
  };
}
