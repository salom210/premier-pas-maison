/**
 * Module de géocodage pour calculer les distances réelles entre adresses
 */

export interface Coordinates {
  lat: number;
  lon: number;
}

/**
 * Cache pour éviter les appels API répétés
 */
class GeocodingCache {
  private static instance: GeocodingCache;
  private cache: Map<string, Coordinates | null> = new Map();
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 jours
  private timestamps: Map<string, number> = new Map();

  static getInstance(): GeocodingCache {
    if (!GeocodingCache.instance) {
      GeocodingCache.instance = new GeocodingCache();
    }
    return GeocodingCache.instance;
  }

  get(address: string): Coordinates | null | undefined {
    const timestamp = this.timestamps.get(address);
    if (timestamp && (Date.now() - timestamp) < this.CACHE_DURATION) {
      return this.cache.get(address);
    }
    return undefined;
  }

  set(address: string, coords: Coordinates | null): void {
    this.cache.set(address, coords);
    this.timestamps.set(address, Date.now());
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }
}

const geocodingCache = GeocodingCache.getInstance();

/**
 * Géocode une adresse en utilisant l'API adresse.data.gouv.fr
 * Retourne les coordonnées GPS (lat, lon)
 * 
 * @param address - Adresse à géocoder (peut contenir juste la rue ou adresse complète)
 * @param codePostal - Code postal optionnel pour limiter la recherche
 * @param ville - Ville optionnelle pour limiter la recherche
 */
export async function geocodeAddress(
  address: string, 
  codePostal?: string, 
  ville?: string
): Promise<Coordinates | null> {
  if (!address) return null;

  // Construire une adresse enrichie avec code postal et ville si disponible
  let enrichedAddress = address;
  if (codePostal) {
    enrichedAddress = `${address}, ${codePostal}`;
  }
  if (codePostal && ville) {
    enrichedAddress = `${address}, ${codePostal} ${ville}`;
  }

  // Vérifier le cache
  const cached = geocodingCache.get(enrichedAddress);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(enrichedAddress)}&limit=1`
    );
    
    if (!response.ok) {
      console.warn(`Geocoding failed for ${enrichedAddress}: ${response.status}`);
      geocodingCache.set(enrichedAddress, null);
      return null;
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const coords: Coordinates = {
        lon: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1]
      };
      
      geocodingCache.set(enrichedAddress, coords);
      console.log(`✅ Géocodage: ${enrichedAddress} → ${coords.lat}, ${coords.lon}`);
      return coords;
    } else {
      console.warn(`No geocoding result for: ${enrichedAddress}`);
      geocodingCache.set(enrichedAddress, null);
      return null;
    }
  } catch (error) {
    console.error(`Error geocoding address ${enrichedAddress}:`, error);
    geocodingCache.set(enrichedAddress, null);
    return null;
  }
}

/**
 * Calcule la distance en mètres entre deux coordonnées GPS
 * Utilise la formule de Haversine
 */
export function calculateDistance(coords1: Coordinates, coords2: Coordinates): number {
  const R = 6371000; // Rayon de la Terre en mètres
  
  const lat1Rad = coords1.lat * Math.PI / 180;
  const lat2Rad = coords2.lat * Math.PI / 180;
  const deltaLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const deltaLon = (coords2.lon - coords1.lon) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance en mètres
}

/**
 * Calcule la distance entre deux adresses
 */
export async function calculateDistanceBetweenAddresses(
  address1: string,
  address2: string
): Promise<number | null> {
  const coords1 = await geocodeAddress(address1);
  const coords2 = await geocodeAddress(address2);
  
  if (!coords1 || !coords2) return null;
  
  return calculateDistance(coords1, coords2);
}

