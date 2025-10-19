import { DVFTransaction } from './dvfLoader';
import { progressiveDVFLoader } from './progressiveLoader';
import { loadDVFData, dvfCache } from './dvfLoader';
import type { MarketAnalysis } from '@/types/project';

export interface DVFAnalysisParams {
  codePostal: string;
  ville: string;
  surface: number;
  nombrePieces: number;
  additionalInfo?: {
    etage?: number;
    dernier_etage?: boolean;
    annee_construction?: number;
    etat?: string;
    charges_trimestrielles?: number;
    prix_demande?: number;
  };
}

export interface SimilarTransaction {
  id: string;
  adresse: string;
  prix_vente: number;
  surface: number;
  nombre_pieces: number;
  date_vente: string;
  distance_km: number;
}

export function analyzeDVFMarket(
  transactions: DVFTransaction[],
  params: DVFAnalysisParams,
  dataSource?: string
): MarketAnalysis | null {
  const { codePostal, surface, nombrePieces } = params;

  console.log(`Analyzing DVF market for postal code ${codePostal}, surface ${surface}m², ${nombrePieces} pieces`);
  console.log(`Total transactions available: ${transactions.length}`);

  // Find similar transactions
  const similarTransactions = findSimilarTransactions(transactions, codePostal, surface, nombrePieces);

  if (similarTransactions.length === 0) {
    console.log(`No similar transactions found for postal code ${codePostal}`);
    return null;
  }

  console.log(`Found ${similarTransactions.length} similar transactions for analysis`);

  // Calculate room-based statistics FIRST
  const roomStats = calculateRoomStatistics(similarTransactions, nombrePieces);
  
  // PRIORITÉ : Utiliser le prix moyen au m² des biens avec le même nombre de pièces
  const exactMatchTransactions = similarTransactions.filter(t => t.nombre_pieces === nombrePieces);
  let prixMoyenM2: number;
  let fiabiliteEstimation: 'forte' | 'moyenne' | 'faible' = 'moyenne';
  
  if (exactMatchTransactions.length >= 10) {
    // Plus de 10 transactions exactes : utiliser uniquement celles-ci
    const exactPrices = exactMatchTransactions.map(t => t.prix_m2).sort((a, b) => a - b);
    prixMoyenM2 = calculateMedian(exactPrices);
    fiabiliteEstimation = 'forte';
    console.log(`Utilisation de ${exactMatchTransactions.length} transactions exactes (fiabilité forte)`);
  } else if (exactMatchTransactions.length > 0) {
    // Moins de 10 mais au moins 1 transaction exacte : utiliser celles-ci mais fiabilité faible
    const exactPrices = exactMatchTransactions.map(t => t.prix_m2).sort((a, b) => a - b);
    prixMoyenM2 = calculateMedian(exactPrices);
    fiabiliteEstimation = 'faible';
    console.log(`Utilisation de ${exactMatchTransactions.length} transactions exactes (fiabilité faible)`);
  } else {
    // Aucune transaction exacte : fallback sur le système de pondération
    const weightedPrices = calculateWeightedPrices(similarTransactions, nombrePieces);
    const pricesPerM2Sorted = [...weightedPrices].sort((a, b) => a - b);
    prixMoyenM2 = calculateMedian(pricesPerM2Sorted);
    fiabiliteEstimation = 'faible';
    console.log(`Aucune transaction exacte, utilisation du système de pondération (fiabilité faible)`);
  }
  
  // Calculer min/max sur TOUTES les transactions similaires (pas seulement les exactes)
  const allPrices = similarTransactions.map(t => t.prix_m2);
  const prixMinM2 = Math.min(...allPrices);
  const prixMaxM2 = Math.max(...allPrices);

  // Calculate estimated values for the property
  const valeurEstimeeBasse = Math.round(prixMoyenM2 * surface * 0.85); // 15% below median
  const valeurEstimeeMediane = Math.round(prixMoyenM2 * surface);
  const valeurEstimeeHaute = Math.round(prixMoyenM2 * surface * 1.15); // 15% above median

  // Calculate price gap if prix_demande is provided
  let ecartPrixDemandeVsMarche = 0;
  if (params.additionalInfo?.prix_demande) {
    const prixDemande = params.additionalInfo.prix_demande;
    ecartPrixDemandeVsMarche = Math.round(((prixDemande - valeurEstimeeMediane) / valeurEstimeeMediane) * 100);
  }

  // Determine conclusion
  let conclusion: 'bonne-affaire' | 'survalorise' | 'correct' = 'correct';
  if (ecartPrixDemandeVsMarche < -5) {
    conclusion = 'bonne-affaire';
  } else if (ecartPrixDemandeVsMarche > 10) {
    conclusion = 'survalorise';
  }


  // Map similar transactions to the expected format
  const transactionsSimilaires: SimilarTransaction[] = similarTransactions.map(t => ({
    id: t.id,
    adresse: `Code postal ${t.code_postal}`, // DVF doesn't have exact addresses
    prix_vente: t.valeur_fonciere,
    surface: t.surface_reelle_bati,
    nombre_pieces: t.nombre_pieces,
    date_vente: t.date_mutation,
    distance_km: 0 // Not applicable for DVF data
  }));

  return {
    prix_moyen_m2_quartier: prixMoyenM2,
    prix_moyen_m2_ville: prixMoyenM2, // Same as quartier for DVF
    prix_min_m2: prixMinM2,
    prix_max_m2: prixMaxM2,
    valeur_estimee_basse: valeurEstimeeBasse,
    valeur_estimee_mediane: valeurEstimeeMediane,
    valeur_estimee_haute: valeurEstimeeHaute,
    nombre_transactions_similaires: similarTransactions.length,
    ecart_prix_demande_vs_marche: ecartPrixDemandeVsMarche,
    conclusion,
    source: 'DVF',
    dataSource: dataSource || '2025', // Ajouter le dataSource
    derniere_maj: new Date().toISOString(),
    transactions_similaires: transactionsSimilaires,
    // Nouvelles statistiques par nombre de pièces
    statistiques_pieces: roomStats,
    // Nouveaux champs pour la fiabilité et le prix exact
    fiabilite_estimation: fiabiliteEstimation,
    prix_moyen_m2_exact: exactMatchTransactions.length > 0 ? prixMoyenM2 : null
  };
}

function findSimilarTransactions(
  transactions: DVFTransaction[],
  codePostal: string,
  surface: number,
  nombrePieces: number
): DVFTransaction[] {
  console.log(`Searching for transactions with postal code: ${codePostal}, surface: ${surface}m², pieces: ${nombrePieces}`);
  
  // Optimisation: créer des index pour accélérer la recherche
  const surfaceMin = surface - 20;
  const surfaceMax = surface + 20;
  
  // First try: exact postal code match with pre-filtering
  let similarTransactions = transactions.filter(transaction => {
    if (transaction.code_postal !== codePostal) return false;
    if (transaction.surface_reelle_bati < surfaceMin || transaction.surface_reelle_bati > surfaceMax) return false;
    return true;
  });

  console.log(`Found ${similarTransactions.length} transactions with exact postal code match`);

  // If no results, try broader search within the department
  if (similarTransactions.length === 0) {
    const department = codePostal.substring(0, 2);
    console.log(`No exact match found, searching in department ${department}`);
    
    const deptSurfaceMin = surface - 30;
    const deptSurfaceMax = surface + 30;
    
    similarTransactions = transactions.filter(transaction => {
      if (!transaction.code_postal.startsWith(department)) return false;
      if (transaction.surface_reelle_bati < deptSurfaceMin || transaction.surface_reelle_bati > deptSurfaceMax) return false;
      return true;
    });

    console.log(`Found ${similarTransactions.length} transactions in department ${department}`);
  }

  // Appliquer la priorité par nombre de pièces avec système de pondération
  similarTransactions = prioritizeByRooms(similarTransactions, nombrePieces);

  // Limiter le nombre de résultats pour éviter les problèmes de performance
  if (similarTransactions.length > 1000) {
    console.log(`Limiting results to 1000 most relevant transactions (from ${similarTransactions.length})`);
    similarTransactions = similarTransactions.slice(0, 1000);
  }

  return similarTransactions;
}

/**
 * Priorise les transactions par proximité du nombre de pièces
 * Système de priorité : exacte > proche > élargie
 */
function prioritizeByRooms(transactions: DVFTransaction[], targetRooms: number): DVFTransaction[] {
  console.log(`Prioritizing ${transactions.length} transactions by room count (target: ${targetRooms})`);
  
  // Grouper les transactions par proximité du nombre de pièces
  const exactMatch = transactions.filter(t => t.nombre_pieces === targetRooms);
  const closeMatch = transactions.filter(t => Math.abs(t.nombre_pieces - targetRooms) === 1);
  const broadMatch = transactions.filter(t => Math.abs(t.nombre_pieces - targetRooms) === 2);
  const otherMatch = transactions.filter(t => Math.abs(t.nombre_pieces - targetRooms) > 2);
  
  console.log(`Room priority breakdown:`);
  console.log(`- Exact match (${targetRooms} pièces): ${exactMatch.length} transactions`);
  console.log(`- Close match (±1 pièce): ${closeMatch.length} transactions`);
  console.log(`- Broad match (±2 pièces): ${broadMatch.length} transactions`);
  console.log(`- Other match (>±2 pièces): ${otherMatch.length} transactions`);
  
  // Trier chaque groupe par date (plus récent en premier)
  const sortByDate = (a: DVFTransaction, b: DVFTransaction) => 
    new Date(b.date_mutation).getTime() - new Date(a.date_mutation).getTime();
  
  exactMatch.sort(sortByDate);
  closeMatch.sort(sortByDate);
  broadMatch.sort(sortByDate);
  otherMatch.sort(sortByDate);
  
  // Retourner dans l'ordre de priorité
  return [...exactMatch, ...closeMatch, ...broadMatch, ...otherMatch];
}

/**
 * Calcule les prix pondérés selon la proximité du nombre de pièces
 * Plus la correspondance est exacte, plus le poids est élevé
 */
function calculateWeightedPrices(transactions: DVFTransaction[], targetRooms: number): number[] {
  return transactions.map(transaction => {
    const roomDifference = Math.abs(transaction.nombre_pieces - targetRooms);
    
    // Système de pondération par proximité
    let weight = 1.0;
    if (roomDifference === 0) {
      weight = 1.0; // Correspondance exacte
    } else if (roomDifference === 1) {
      weight = 0.8; // Proche (±1 pièce)
    } else if (roomDifference === 2) {
      weight = 0.6; // Élargi (±2 pièces)
    } else {
      weight = 0.4; // Autres
    }
    
    // Appliquer le poids au prix (plus le poids est élevé, plus le prix influence l'analyse)
    return transaction.prix_m2 * weight;
  });
}

/**
 * Calcule des statistiques détaillées par nombre de pièces
 */
function calculateRoomStatistics(transactions: DVFTransaction[], targetRooms: number) {
  const roomGroups = new Map<number, DVFTransaction[]>();
  
  // Grouper les transactions par nombre de pièces
  transactions.forEach(transaction => {
    const rooms = transaction.nombre_pieces;
    if (!roomGroups.has(rooms)) {
      roomGroups.set(rooms, []);
    }
    roomGroups.get(rooms)!.push(transaction);
  });
  
  // Calculer les statistiques pour chaque groupe
  const roomStats = Array.from(roomGroups.entries()).map(([rooms, trans]) => {
    const prices = trans.map(t => t.prix_m2);
    const pricesSorted = [...prices].sort((a, b) => a - b);
    
    return {
      nombre_pieces: rooms,
      nombre_transactions: trans.length,
      prix_moyen_m2: calculateMedian(pricesSorted),
      prix_min_m2: Math.min(...prices),
      prix_max_m2: Math.max(...prices),
      ecart_avec_cible: Math.abs(rooms - targetRooms),
      priorite: (rooms === targetRooms ? 'exacte' : 
                Math.abs(rooms - targetRooms) === 1 ? 'proche' :
                Math.abs(rooms - targetRooms) === 2 ? 'elargie' : 'autre') as 'exacte' | 'proche' | 'elargie' | 'autre'
    };
  });
  
  // Trier par priorité puis par nombre de transactions
  roomStats.sort((a, b) => {
    const priorityOrder = { 'exacte': 0, 'proche': 1, 'elargie': 2, 'autre': 3 };
    const aPriority = priorityOrder[a.priorite as keyof typeof priorityOrder];
    const bPriority = priorityOrder[b.priorite as keyof typeof priorityOrder];
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    return b.nombre_transactions - a.nombre_transactions;
  });
  
  return {
    cible_pieces: targetRooms,
    total_transactions: transactions.length,
    groupes_pieces: roomStats,
    correspondance_exacte: roomStats.find(s => s.priorite === 'exacte')?.nombre_transactions || 0,
    correspondance_proche: roomStats.find(s => s.priorite === 'proche')?.nombre_transactions || 0
  };
}

function calculateMedian(sortedArray: number[]): number {
  const length = sortedArray.length;
  if (length === 0) return 0;
  
  if (length % 2 === 0) {
    return (sortedArray[length / 2 - 1] + sortedArray[length / 2]) / 2;
  } else {
    return sortedArray[Math.floor(length / 2)];
  }
}

// Helper function to get department from postal code
export function getDepartmentFromPostalCode(codePostal: string): string {
  return codePostal.substring(0, 2);
}

// Main function to analyze DVF market data
export async function analyzeDVFMarketData(params: DVFAnalysisParams): Promise<MarketAnalysis | null> {
  try {
    // Essayer d'abord le loader progressif
    try {
      const transactions = await progressiveDVFLoader.getData();
      const dataSource = progressiveDVFLoader.getDataSource();
      
      console.log(`Analyzing DVF market for postal code ${params.codePostal} with ${transactions.length} total transactions (progressive loader, source: ${dataSource})`);
      
      // Vérifier s'il y a des transactions pour le code postal exact
      const exactPostalCodeTransactions = transactions.filter(t => t.code_postal === params.codePostal);
      console.log(`Found ${exactPostalCodeTransactions.length} transactions for exact postal code ${params.codePostal}`);
      
      // Si aucune transaction pour le code postal exact, utiliser le fallback IA
      if (exactPostalCodeTransactions.length === 0) {
        console.log(`No exact postal code match for ${params.codePostal}, falling back to AI analysis`);
        return null; // Retourner null pour déclencher le fallback IA
      }
      
      const analysis = analyzeDVFMarket(transactions, params, dataSource);
      if (analysis) {
        analysis.source = 'DVF';
      }
      
      return analysis;
    } catch (progressiveError) {
      console.warn('Progressive loader failed, falling back to original loader:', progressiveError);
      
      const transactions = await loadDVFData();
      const dataSource = dvfCache.getDataSource();
      
      console.log(`Analyzing DVF market for postal code ${params.codePostal} with ${transactions.length} total transactions (original loader, source: ${dataSource})`);
      
      // Vérifier s'il y a des transactions pour le code postal exact
      const exactPostalCodeTransactions = transactions.filter(t => t.code_postal === params.codePostal);
      console.log(`Found ${exactPostalCodeTransactions.length} transactions for exact postal code ${params.codePostal}`);
      
      // Si aucune transaction pour le code postal exact, utiliser le fallback IA
      if (exactPostalCodeTransactions.length === 0) {
        console.log(`No exact postal code match for ${params.codePostal}, falling back to AI analysis`);
        return null; // Retourner null pour déclencher le fallback IA
      }
      
      const analysis = analyzeDVFMarket(transactions, params, dataSource);
      if (analysis) {
        analysis.source = 'DVF';
      }
      
      return analysis;
    }
  } catch (error) {
    console.error('Error analyzing DVF market data:', error);
    return null;
  }
}