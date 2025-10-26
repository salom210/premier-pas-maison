/**
 * Module de scoring géographique pour prioriser les transactions DVF
 * par rapport à la proximité géographique de l'adresse de l'utilisateur
 */

import { DVFTransaction } from './dvfLoader';
import { geocodeAddress, calculateDistance, type Coordinates } from './geocoding';

/**
 * Normalise une adresse pour la comparaison (minuscules, sans accents, sans caractères spéciaux)
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';
  
  return address
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9\s]/g, '') // Supprimer les caractères spéciaux
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim();
}

/**
 * Extrait et compare les numéros de rue pour déterminer la proximité
 */
function extractStreetNumber(address: string): number | null {
  const match = address.match(/^(\d+)\s+/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Extrait le type de voie et le nom de la rue d'une adresse normalisée
 */
function extractStreetParts(normalizedAddress: string): { typeVoie?: string; nomVoie?: string } {
  const commonStreetTypes = ['rue', 'avenue', 'boulevard', 'chemin', 'impasse', 'place', 'allee', 'passage', 'cours', 'quai'];
  
  for (const type of commonStreetTypes) {
    const regex = new RegExp(`^(\\d+)\\s+${type}\\s+(.+)$`, 'i');
    const match = normalizedAddress.match(regex);
    if (match) {
      // match[0] = toute la correspondance
      // match[1] = le numéro
      // match[2] = le nom de la rue (tout ce qui suit)
      const nomVoieNormalized = normalizeAddress(match[2].trim());
      return {
        typeVoie: type,
        nomVoie: nomVoieNormalized
      };
    }
  }
  
  // Si pas de correspondance, essayer de trouver juste le nom de la rue
  const words = normalizedAddress.split(' ');
  if (words.length > 1) {
    return {
      nomVoie: words.slice(1).join(' ')
    };
  }
  
  return {};
}

/**
 * Calcule le score de proximité géographique (0-100)
 * 
 * 100 = même rue (correspondance exacte du nom)
 * 80 = même rue, numéro éloigné
 * 60 = même type de voie, même commune
 * 40 = même commune
 * 20 = même code postal
 * 0 = autre
 */
export function calculateProximityScore(
  userAddress: string,
  userCommune: string,
  transaction: DVFTransaction
): number {
  if (!userAddress || !transaction) return 0;
  
  // Normaliser les adresses
  const normalizedUserAddress = normalizeAddress(userAddress);
  const normalizedTransactionAddress = transaction.adresse_complete 
    ? normalizeAddress(transaction.adresse_complete) 
    : '';
  
  const normalizedUserCommune = normalizeAddress(userCommune);
  const normalizedTransactionCommune = transaction.commune 
    ? normalizeAddress(transaction.commune) 
    : '';
  
  // Vérifier si même rue (correspondance du nom de voie)
  if (normalizedTransactionAddress) {
    const userStreetParts = extractStreetParts(normalizedUserAddress);
    const transactionStreetParts = extractStreetParts(normalizedTransactionAddress);
    
    if (userStreetParts.typeVoie && transactionStreetParts.typeVoie) {
      // Comparer le type de voie et le nom de la rue
      if (userStreetParts.typeVoie === transactionStreetParts.typeVoie) {
        if (userStreetParts.nomVoie && transactionStreetParts.nomVoie) {
          // Calculer la similarité du nom de rue (Levenshtein simplifié)
          const similarity = calculateSimilarity(userStreetParts.nomVoie, transactionStreetParts.nomVoie);
          
          // Debug pour voir ce qui se compare
          if (Math.random() < 0.1) { // Log 10% des comparaisons
            console.log(`🔍 Comparaison: "${userStreetParts.nomVoie}" vs "${transactionStreetParts.nomVoie}" - similarity: ${similarity.toFixed(2)}`);
          }
          
          if (similarity > 0.8) {
            // Extraire les numéros de rue pour calculer la proximité
            const userStreetNumber = extractStreetNumber(normalizedUserAddress);
            const transactionStreetNumber = extractStreetNumber(normalizedTransactionAddress);
            
            if (userStreetNumber && transactionStreetNumber) {
              const difference = Math.abs(userStreetNumber - transactionStreetNumber);
              
              // Rayon de 100m basé sur la distance entre numéros de rue
              // ~10 numéros = ~50m, ~20 numéros = ~100m en zone urbaine
              if (difference <= 10) {
                // Log pour debug
                console.log(`🎯 RAYON 50M: ${transaction.adresse_complete} - Score: 100 (diff numéros: ${difference})`);
                return 100; // Très proche (~0-50m)
              } else if (difference <= 20) {
                console.log(`✅ RAYON 100M: ${transaction.adresse_complete} - Score: 95 (diff numéros: ${difference})`);
                return 95; // Proche (~51-100m)
              } else if (difference <= 50) {
                console.log(`📍 RAYON 250M: ${transaction.adresse_complete} - Score: 85 (diff numéros: ${difference})`);
                return 85; // Moyennement proche (~101-250m)
              } else {
                console.log(`📌 HORS RAYON: ${transaction.adresse_complete} - Score: 60 (diff numéros: ${difference})`);
                return 60; // Hors rayon immédiat
              }
            }
            
            // Même rue mais pas de numéro disponible
            if (similarity === 1.0) {
              console.log(`🏠 MÊME RUE SANS NUMÉRO: ${transaction.adresse_complete} - Score: 95`);
              return 95; // Correspondance exacte sans numéro
            }
            // Rue similaire mais nom légèrement différent - ne pas le traiter comme la même rue
            console.log(`🟡 RUE SIMILAIRE MAIS DIFFÉRENTE: ${transaction.adresse_complete} - Score: 50 (similarity: ${similarity.toFixed(2)})`);
            return 50; // Rue similaire mais différente
          }
        }
      }
    }
  }
  
  // Vérifier si même commune
  if (normalizedTransactionCommune && normalizedUserCommune) {
    if (normalizedUserCommune === normalizedTransactionCommune) {
      // Vérifier si même type de voie
      const userStreetParts = extractStreetParts(normalizedUserAddress);
      const transactionStreetParts = extractStreetParts(normalizedTransactionAddress);
      
      if (userStreetParts.typeVoie && transactionStreetParts.typeVoie) {
        if (userStreetParts.typeVoie === transactionStreetParts.typeVoie) {
          // Vérifier si les noms de rue ont des mots communs
          if (userStreetParts.nomVoie && transactionStreetParts.nomVoie) {
            const similarity = calculateSimilarity(userStreetParts.nomVoie, transactionStreetParts.nomVoie);
            if (similarity > 0.5) {
              console.log(`🟢 MÊME TYPE RUE SIMILAIRE: ${transaction.adresse_complete || transaction.commune} - Score: 55 (similarity: ${similarity.toFixed(2)})`);
              return 55; // Même type, rue similaire, même commune
            }
          }
          // Si même type de voie mais nom de rue complètement différent
          console.log(`🔵 MÊME TYPE RUE DIFFÉRENTE: ${transaction.adresse_complete || transaction.commune} - Score: 25`);
          return 25; // Même type de voie, même commune, rue différente
        }
      }
      
      // Vérifier si quartier similaire (rue avec nom similaire dans même commune)
      if (normalizedTransactionAddress) {
        const similarity = calculateSimilarity(normalizedUserAddress, normalizedTransactionAddress);
        if (similarity > 0.4) {
          return 50; // Quartier similaire
        }
      }
      
      // Si dans la même commune mais rue complètement différente
      // Utiliser un score minimal pour inciter le tri par nombre de pièces et surface
      console.log(`🟣 MÊME COMMUNE RUE DIFF: ${transaction.commune || transaction.code_postal} - Score: 15`);
      return 15; // Même commune mais rue différente
    }
  }
  
  return 20; // Au moins même code postal (déjà filtré avant)
}

/**
 * Calcule la similarité entre deux chaînes (algorithme de Jaro-Winkler simplifié)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  
  // Normaliser davantage pour mieux comparer
  const normalizeForComparison = (s: string) => s.replace(/^(de|du|des|le|la|les)\s+/i, '').trim();
  const norm1 = normalizeForComparison(str1);
  const norm2 = normalizeForComparison(str2);
  
  if (norm1 === norm2) return 1.0;
  
  // Comparaison stricte par mots - il faut que tous les mots significatifs correspondent
  const words1 = norm1.split(' ').filter(w => w.length > 2);
  const words2 = norm2.split(' ').filter(w => w.length > 2);
  
  // Compter les mots en commun exacts (pas de partial match)
  let exactMatches = 0;
  for (const word1 of words1) {
    if (words2.includes(word1)) {
      exactMatches++;
    }
  }
  
  // Pour être considéré comme similaire, au moins 75% des mots doivent correspondre
  const minWords = Math.min(words1.length, words2.length);
  const similarity = minWords > 0 ? exactMatches / minWords : 0;
  
  return similarity;
}

/**
 * Calcule le score combiné pondéré
 * 
 * Pondération révisée pour donner plus de poids à la proximité géographique :
 * - Proximité géographique : 60%
 * - Nombre de pièces : 25%
 * - Surface : 15%
 */
export function calculateCombinedScore(
  proximityScore: number,
  roomsDifference: number,
  surfaceDifference: number,
  maxRoomsDifference: number = 3,
  maxSurfaceDifference: number = 50
): number {
  // Score de proximité (0-100) * 60%
  const proximityWeight = 0.6;
  
  // Score nombre de pièces (0-100) * 25%
  // Plus la différence est faible, plus le score est élevé
  const roomsScore = maxRoomsDifference > 0 
    ? Math.max(0, 100 - (roomsDifference / maxRoomsDifference) * 100)
    : 100;
  const roomsWeight = 0.25;
  
  // Score surface (0-100) * 15%
  // Pondéré proportionnellement à la surface (1m² de différence sur 50m² vs 100m²)
  const surfaceScore = maxSurfaceDifference > 0
    ? Math.max(0, 100 - (Math.abs(surfaceDifference) / maxSurfaceDifference) * 100)
    : 100;
  const surfaceWeight = 0.15;
  
  // Score final combiné
  const combinedScore = (
    proximityScore * proximityWeight +
    roomsScore * roomsWeight +
    surfaceScore * surfaceWeight
  );
  
  return Math.round(combinedScore);
}

/**
 * Interface pour une transaction avec score
 */
export interface ScoredTransaction extends DVFTransaction {
  score_combiné: number;
  score_proximité: number;
  score_pièces: number;
  score_surface: number;
  distance_m?: number; // Distance en mètres depuis l'adresse de l'utilisateur
}

/**
 * Calcule les scores pour une liste de transactions
 */
/**
 * Calcule le score de proximité basé sur la distance réelle en mètres
 */
async function calculateRealDistanceScore(
  userCoords: Coordinates,
  transaction: DVFTransaction
): Promise<number> {
  if (!transaction.adresse_complete) {
    // Fallback au scoring basé sur la proximité
    return calculateProximityScore('', '', transaction);
  }

  try {
    // Utiliser le code postal et la commune pour améliorer la précision
    const transactionCoords = await geocodeAddress(
      transaction.adresse_complete,
      transaction.code_postal,
      transaction.commune
    );
    
    if (!transactionCoords) {
      // Si le géocodage échoue, utiliser le fallback
      return calculateProximityScore('', '', transaction);
    }

    const distance = calculateDistance(userCoords, transactionCoords);
    
    // Rayon de 100m pour prioriser les transactions proches
    if (distance <= 50) {
      console.log(`🎯 RAYON 50M: ${transaction.adresse_complete} - Score: 100 (distance: ${Math.round(distance)}m)`);
      return 100;
    } else if (distance <= 100) {
      console.log(`✅ RAYON 100M: ${transaction.adresse_complete} - Score: 95 (distance: ${Math.round(distance)}m)`);
      return 95;
    } else if (distance <= 250) {
      console.log(`📍 RAYON 250M: ${transaction.adresse_complete} - Score: 85 (distance: ${Math.round(distance)}m)`);
      return 85;
    } else if (distance <= 500) {
      console.log(`📌 RAYON 500M: ${transaction.adresse_complete} - Score: 70 (distance: ${Math.round(distance)}m)`);
      return 70;
    } else {
      console.log(`📊 HORS RAYON: ${transaction.adresse_complete} - Score: 50 (distance: ${Math.round(distance)}m)`);
      return 50;
    }
  } catch (error) {
    console.error(`Error calculating distance for ${transaction.adresse_complete}:`, error);
    return calculateProximityScore('', '', transaction);
  }
}

export function scoreTransactions(
  transactions: DVFTransaction[],
  userAddress: string,
  userCommune: string,
  targetSurface: number,
  targetRooms: number
): ScoredTransaction[] {
  // Calculer les différences max pour la normalisation
  const roomDifferences = transactions.map(t => Math.abs(t.nombre_pieces - targetRooms));
  const surfaceDifferences = transactions.map(t => Math.abs(t.surface_reelle_bati - targetSurface));
  
  const maxRoomsDifference = Math.max(...roomDifferences, 1);
  const maxSurfaceDifference = Math.max(...surfaceDifferences, 1);
  
  return transactions.map(transaction => {
    const proximityScore = calculateProximityScore(userAddress, userCommune, transaction);
    const roomsDifference = Math.abs(transaction.nombre_pieces - targetRooms);
    const surfaceDifference = transaction.surface_reelle_bati - targetSurface;
    
    const combinedScore = calculateCombinedScore(
      proximityScore,
      roomsDifference,
      surfaceDifference,
      maxRoomsDifference,
      maxSurfaceDifference
    );
    
    return {
      ...transaction,
      score_combiné: combinedScore,
      score_proximité: proximityScore,
      score_pièces: Math.max(0, 100 - (roomsDifference / maxRoomsDifference) * 100),
      score_surface: Math.max(0, 100 - (Math.abs(surfaceDifference) / maxSurfaceDifference) * 100)
    };
  });
}

/**
 * Version asynchrone avec géocodage réel
 */
export async function scoreTransactionsWithGeocoding(
  transactions: DVFTransaction[],
  userAddress: string,
  userCommune: string,
  targetSurface: number,
  targetRooms: number,
  userCodePostal?: string
): Promise<ScoredTransaction[]> {
  console.log(`🌍 Géocodage de l'adresse utilisateur: ${userAddress}`);
  const userCoords = await geocodeAddress(userAddress, userCodePostal, userCommune);
  
  if (!userCoords) {
    console.warn('⚠️ Impossible de géocoder l\'adresse utilisateur, fallback au scoring classique');
    return scoreTransactions(transactions, userAddress, userCommune, targetSurface, targetRooms);
  }

  console.log(`✅ Coordonnées utilisateur: ${userCoords.lat}, ${userCoords.lon}`);

  // Calculer les différences max pour la normalisation
  const roomDifferences = transactions.map(t => Math.abs(t.nombre_pieces - targetRooms));
  const surfaceDifferences = transactions.map(t => Math.abs(t.surface_reelle_bati - targetSurface));
  
  const maxRoomsDifference = Math.max(...roomDifferences, 1);
  const maxSurfaceDifference = Math.max(...surfaceDifferences, 1);
  
  // Géocoder toutes les transactions en parallèle
  const scoredTransactions = await Promise.all(
    transactions.map(async (transaction) => {
      const proximityScore = await calculateRealDistanceScore(userCoords, transaction);
      const roomsDifference = Math.abs(transaction.nombre_pieces - targetRooms);
      const surfaceDifference = transaction.surface_reelle_bati - targetSurface;
      
      const combinedScore = calculateCombinedScore(
        proximityScore,
        roomsDifference,
        surfaceDifference,
        maxRoomsDifference,
        maxSurfaceDifference
      );

      // Calculer la distance réelle si possible
      let distance_m: number | undefined;
      if (transaction.adresse_complete) {
        // Utiliser le code postal de la transaction pour limiter la recherche
        const transactionCoords = await geocodeAddress(
          transaction.adresse_complete, 
          transaction.code_postal, 
          transaction.commune
        );
        if (transactionCoords) {
          distance_m = calculateDistance(userCoords, transactionCoords);
        }
      }
      
      return {
        ...transaction,
        score_combiné: combinedScore,
        score_proximité: proximityScore,
        score_pièces: Math.max(0, 100 - (roomsDifference / maxRoomsDifference) * 100),
        score_surface: Math.max(0, 100 - (Math.abs(surfaceDifference) / maxSurfaceDifference) * 100),
        distance_m
      };
    })
  );
  
  return scoredTransactions;
}

