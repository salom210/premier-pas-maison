import type { PropertyInfo, PriceAdjustment, MarketAnalysis } from '@/types/project';

export interface AdjustmentData {
  id: string;
  label: string;
  type: 'bonus' | 'malus';
  impact_pct: number;
}

// Cache pour les données d'ajustements
let adjustmentsCache: AdjustmentData[] | null = null;

/**
 * Charge les données d'ajustements depuis le fichier CSV
 */
export async function loadAdjustmentsData(): Promise<AdjustmentData[]> {
  if (adjustmentsCache) {
    return adjustmentsCache;
  }

  try {
    const response = await fetch('/adjustments.csv');
    const csvText = await response.text();
    
    const lines = csvText.split('\n').filter(line => line.trim());
    const adjustments: AdjustmentData[] = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const [id, label, type, impact_pct] = lines[i].split(',');
      if (id && label && type && impact_pct) {
        adjustments.push({
          id: id.trim(),
          label: label.trim(),
          type: type.trim() as 'bonus' | 'malus',
          impact_pct: parseInt(impact_pct.trim())
        });
      }
    }
    
    adjustmentsCache = adjustments;
    return adjustments;
  } catch (error) {
    console.error('Erreur lors du chargement des ajustements:', error);
    return [];
  }
}

/**
 * Détecte les ajustements applicables basés sur les caractéristiques du bien
 */
export async function detectApplicableAdjustments(propertyInfo: PropertyInfo): Promise<PriceAdjustment[]> {
  const applicableAdjustments: PriceAdjustment[] = [];
  
  // Charger les données d'ajustements depuis le CSV
  const adjustmentsData = await loadAdjustmentsData();
  
  // Debug temporaire
  console.log('PropertyInfo pour détection:', propertyInfo);
  
  // Surcôtes (bonus)
  if (propertyInfo.dernier_etage === true && propertyInfo.ascenseur === true) {
    const s1Data = adjustmentsData.find(adj => adj.id === 'S1');
    if (s1Data) {
      applicableAdjustments.push({
        id: s1Data.id,
        label: s1Data.label,
        type: s1Data.type,
        impact_pct: s1Data.impact_pct,
        isApplied: true
      });
    }
  }
  
  if (propertyInfo.balcon_terrasse === true || (propertyInfo.surface_exterieure && propertyInfo.surface_exterieure > 0)) {
    applicableAdjustments.push({
      id: 'S2',
      label: 'Balcon terrasse ou extérieur privatif',
      type: 'bonus',
      impact_pct: 10,
      isApplied: true
    });
  }
  
  if (propertyInfo.etat === 'excellent' && propertyInfo.annee_construction && propertyInfo.annee_construction > 2019) {
    applicableAdjustments.push({
      id: 'S3',
      label: 'Bien entièrement rénové (<5 ans)',
      type: 'bonus',
      impact_pct: 8,
      isApplied: true
    });
  }
  
  if (propertyInfo.dpe === 'A' || propertyInfo.dpe === 'B') {
    applicableAdjustments.push({
      id: 'S4',
      label: 'DPE A ou B',
      type: 'bonus',
      impact_pct: 7,
      isApplied: true
    });
  }
  
  if (propertyInfo.parking === true) {
    applicableAdjustments.push({
      id: 'S6',
      label: 'Parking ou stationnement privatif',
      type: 'bonus',
      impact_pct: 5,
      isApplied: true
    });
  }
  
  if (propertyInfo.annee_construction && propertyInfo.annee_construction > 2014) {
    applicableAdjustments.push({
      id: 'S13',
      label: 'Immeuble récent (<10 ans)',
      type: 'bonus',
      impact_pct: 6,
      isApplied: true
    });
  }
  
  // Décôtes (malus)
  if (propertyInfo.etage === 0) {
    applicableAdjustments.push({
      id: 'D1',
      label: 'Rez-de-chaussée côté rue vis-à-vis et bruit',
      type: 'malus',
      impact_pct: -15,
      isApplied: true
    });
  }
  
  if (propertyInfo.dpe === 'F' || propertyInfo.dpe === 'G') {
    applicableAdjustments.push({
      id: 'D3',
      label: 'DPE F ou G (passoire thermique)',
      type: 'malus',
      impact_pct: -12,
      isApplied: true
    });
  }
  
  if (propertyInfo.etat === 'travaux-lourds') {
    applicableAdjustments.push({
      id: 'D4',
      label: 'Travaux majeurs à prévoir (toiture façade ascenseur)',
      type: 'malus',
      impact_pct: -20,
      isApplied: true
    });
  }
  
  if (propertyInfo.etat === 'a-renover') {
    applicableAdjustments.push({
      id: 'D9',
      label: 'Immeuble ancien >50 ans sans rénovation significative',
      type: 'malus',
      impact_pct: -5,
      isApplied: true
    });
  }
  
  // Absence ascenseur étage élevé ou dernier étage sans ascenseur
  console.log('🔍 DEBUG D11:', {
    ascenseur: propertyInfo.ascenseur,
    dernier_etage: propertyInfo.dernier_etage,
    etage: propertyInfo.etage,
    condition1: propertyInfo.etage && propertyInfo.etage > 4 && (propertyInfo.ascenseur === false || propertyInfo.ascenseur === undefined),
    condition2: propertyInfo.dernier_etage === true && (propertyInfo.ascenseur === false || propertyInfo.ascenseur === undefined),
    shouldApply: (propertyInfo.ascenseur === false || propertyInfo.ascenseur === undefined) && (
      (propertyInfo.etage && propertyInfo.etage > 4) || 
      propertyInfo.dernier_etage === true
    )
  });
  
  if ((propertyInfo.ascenseur === false || propertyInfo.ascenseur === undefined) && (
    (propertyInfo.etage && propertyInfo.etage > 4) || 
    propertyInfo.dernier_etage === true
  )) {
    applicableAdjustments.push({
      id: 'D11',
      label: 'Absence ascenseur étage élevé >4 sans ascenseur',
      type: 'malus',
      impact_pct: -10,
      isApplied: true
    });
  }
  
  if (propertyInfo.ascenseur === false && propertyInfo.etage && propertyInfo.etage > 2 && propertyInfo.dernier_etage === false) {
    applicableAdjustments.push({
      id: 'D15',
      label: 'Étage élevé sans ascenseur petit immeuble',
      type: 'malus',
      impact_pct: -8,
      isApplied: true
    });
  }
  
  // Debug temporaire
  console.log('Ajustements détectés:', applicableAdjustments.length, applicableAdjustments);
  
  return applicableAdjustments;
}

/**
 * Calcule le prix ajusté basé sur les ajustements appliqués
 */
export function calculateAdjustedPrice(basePrice: number, adjustments: PriceAdjustment[]): number {
  const appliedAdjustments = adjustments.filter(adj => adj.isApplied);
  const totalImpact = appliedAdjustments.reduce((sum, adj) => sum + adj.impact_pct, 0);
  
  return Math.round(basePrice * (1 + totalImpact / 100));
}

/**
 * Calcule l'impact total en pourcentage
 */
export function calculateTotalImpact(adjustments: PriceAdjustment[]): number {
  const appliedAdjustments = adjustments.filter(adj => adj.isApplied);
  return appliedAdjustments.reduce((sum, adj) => sum + adj.impact_pct, 0);
}

/**
 * Met à jour les prix ajustés dans l'analyse de marché
 */
export function updateMarketAnalysisWithAdjustments(
  marketAnalysis: MarketAnalysis,
  adjustments: PriceAdjustment[]
): MarketAnalysis {
  const prixReferenceM2 = marketAnalysis.prix_moyen_m2_exact ?? marketAnalysis.prix_moyen_m2_quartier;
  const prixAjusteM2 = calculateAdjustedPrice(prixReferenceM2, adjustments);
  
  return {
    ...marketAnalysis,
    prix_ajuste_m2: prixAjusteM2,
    valeur_estimee_ajustee: calculateAdjustedPrice(marketAnalysis.valeur_estimee_mediane, adjustments)
  };
}

