import Papa from 'papaparse';
import { DVFTransaction } from './dvfLoader';

export interface LoadingProgress {
  stage: 'loading' | 'parsing' | 'filtering' | 'complete' | 'error';
  progress: number;
  message: string;
  totalRows?: number;
  transactionsLoaded?: number;
}

interface DVFCSVRow {
  idmutation: string;           // "No disposition" (ID unique)
  datemut: string;              // "Date mutation" (format DD/MM/YYYY)
  valeurfonc: string;           // "Valeur fonciere" (format français avec virgule)
  libtypbien: string;           // "Type local"
  sbatapt: string;              // "Surface reelle bati"
  code_postal: string;          // "Code postal" (colonne directe)
  nbapt1pp: string;             // "Nombre pieces principales"
}

class ProgressiveDVFLoader {
  private static instance: ProgressiveDVFLoader;
  private data: DVFTransaction[] | null = null;
  private lastLoadTime: number = 0;
  private dataSource: string = '2025';
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_TRANSACTIONS = 10000;
  private readonly SMART_ANALYSIS_LIMIT = 1000;

  private constructor() {}

  static getInstance(): ProgressiveDVFLoader {
    if (!ProgressiveDVFLoader.instance) {
      ProgressiveDVFLoader.instance = new ProgressiveDVFLoader();
    }
    return ProgressiveDVFLoader.instance;
  }

  async getData(onProgress?: (progress: LoadingProgress) => void): Promise<DVFTransaction[]> {
    if (this.data && this.isCacheValid()) {
      console.log('Using cached DVF data');
      return this.data;
    }

    console.log('Loading fresh DVF data with progress...');
    this.data = await this.loadCSVDataWithProgress(onProgress);
    this.lastLoadTime = Date.now();
    return this.data;
  }

  getDataSource(): string {
    return this.dataSource;
  }

  // Méthode pour vider le cache (utile pour les tests)
  clearCache(): void {
    this.data = null;
    this.lastLoadTime = 0;
    this.dataSource = '2025'; // Réinitialiser à la valeur par défaut
  }

  private isCacheValid(): boolean {
    return this.data !== null && (Date.now() - this.lastLoadTime) < this.CACHE_DURATION;
  }

  private async loadCSVDataWithProgress(onProgress?: (progress: LoadingProgress) => void): Promise<DVFTransaction[]> {
    // Essayer d'abord le fichier principal avec analyse intelligente
    let transactions: DVFTransaction[] = [];
    this.dataSource = '2025'; // Réinitialiser à 2025 par défaut
    
    try {
      console.log('Loading primary file (2025 data) with smart analysis...');
      onProgress?.({
        stage: 'loading',
        progress: 0,
        message: 'Chargement des données 2025 (analyse intelligente)...'
      });
      transactions = await this.loadCSVFileWithSmartAnalysis('/mutations_d93_2025.csv', onProgress);
      console.log('Primary file loaded, transactions:', transactions.length);
      
      // Si on a trouvé suffisamment de données (>= 10 transactions), on s'arrête là
      if (transactions.length >= 10) {
        console.log('Sufficient data found in primary file, skipping fallback');
        this.dataSource = '2025';
        return transactions;
      }
      
      console.log('Insufficient data in primary file, trying fallback...');
    } catch (error) {
      console.warn('Failed to load primary file:', error);
      transactions = [];
    }
    
    // Si pas assez de données trouvées, essayer le fichier de fallback
    if (transactions.length < 10) {
      console.log('Trying fallback file with smart analysis...');
      onProgress?.({
        stage: 'loading',
        progress: 0,
        message: 'Données 2025 insuffisantes, chargement des données 2024...'
      });
      try {
        const fallbackTransactions = await this.loadCSVFileWithSmartAnalysis('/mutations_d93_2024.csv', onProgress);
        console.log('Fallback file loaded, transactions:', fallbackTransactions.length);
        
        if (fallbackTransactions.length > 0) {
          transactions = fallbackTransactions;
          this.dataSource = '2024';
        }
      } catch (error) {
        console.error('Failed to load fallback file:', error);
        onProgress?.({
          stage: 'error',
          progress: 0,
          message: 'Erreur: Impossible de charger les données DVF'
        });
        if (transactions.length === 0) {
          throw new Error('Both DVF files failed to load');
        }
      }
    }
    
    return transactions;
  }

  private async loadCSVFileWithSmartAnalysis(filePath: string, onProgress?: (progress: LoadingProgress) => void): Promise<DVFTransaction[]> {
    try {
      console.log(`Loading DVF CSV data from ${filePath} with smart analysis (first ${this.SMART_ANALYSIS_LIMIT} rows)...`);
      const response = await fetch(filePath);
      console.log('CSV response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to load DVF data from ${filePath}: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();
      console.log('CSV text length:', csvText.length);

      onProgress?.({
        stage: 'parsing',
        progress: 20,
        message: 'Analyse des données DVF en cours...'
      });

      return new Promise((resolve, reject) => {
        const validTransactions: DVFTransaction[] = [];
        let processedCount = 0;
        let validCount = 0;
        let totalRows = 0;

        Papa.parse<DVFCSVRow>(csvText, {
          header: true,
          delimiter: ';',
          skipEmptyLines: true,
          chunk: (results, parser) => {
            totalRows += results.data.length;
            console.log(`Processing chunk: ${results.data.length} rows`);

            for (const row of results.data) {
              if (processedCount >= this.SMART_ANALYSIS_LIMIT) {
                console.log(`Reached smart analysis limit (${this.SMART_ANALYSIS_LIMIT}), stopping processing`);
                parser.abort();
                break;
              }

              const transaction = this.parseRow(row);
              if (transaction && this.isValidTransaction(transaction)) {
                validTransactions.push(transaction);
                validCount++;
              }
              processedCount++;
            }
          },
          complete: (results) => {
            onProgress?.({
              stage: 'filtering',
              progress: 80,
              message: `Analyse intelligente terminée, ${validCount} transactions valides trouvées`,
              totalRows: processedCount,
              transactionsLoaded: validCount
            });

            // Trier par date pour avoir les plus récentes
            validTransactions.sort((a, b) => 
              new Date(b.date_mutation).getTime() - new Date(a.date_mutation).getTime()
            );

            onProgress?.({
              stage: 'complete',
              progress: 100,
              message: `Chargement terminé: ${validCount} transactions valides`,
              totalRows: processedCount,
              transactionsLoaded: validCount
            });

            try {
              console.log('Smart analysis completed, total rows processed:', processedCount);
              console.log('Valid transactions found:', validCount);
              if (validTransactions.length > 0) {
                console.log('First valid transaction:', validTransactions[0]);
              }
              resolve(validTransactions);
            } catch (error) {
              console.error('Error in complete callback:', error);
              reject(error);
            }
          },
          error: (error) => {
            console.error('CSV parsing error:', error);
            reject(new Error(`CSV parsing error: ${error.message}`));
          }
        });
      });
    } catch (error) {
      console.error(`Error loading DVF data from ${filePath}:`, error);
      throw error;
    }
  }

  private parseRow(row: DVFCSVRow): DVFTransaction | null {
    try {
      // Utiliser directement le code postal (plus besoin d'extraire depuis l_codinsee)
      const codePostal = row.code_postal;
      if (!codePostal || codePostal.length !== 5) return null;

      // Parser la valeur foncière (format français: "468000,00" → 468000.00)
      const valeurFonciere = parseFloat(row.valeurfonc.replace(',', '.'));
      if (isNaN(valeurFonciere) || valeurFonciere <= 0) return null;

      // Parser la surface (format français: "48,00" → 48.00)
      const surface = parseFloat(row.sbatapt.replace(',', '.'));
      if (isNaN(surface) || surface <= 0) return null;

      const prixM2 = valeurFonciere / surface;

      // Utiliser directement le nombre de pièces principales
      const nbPieces = parseInt(row.nbapt1pp) || 0;

      // Parser la date (format: DD/MM/YYYY → YYYY-MM-DD)
      const dateMutation = this.parseDate(row.datemut);

      return {
        id: row.idmutation,
        date_mutation: dateMutation,
        valeur_fonciere: valeurFonciere,
        type_local: row.libtypbien,
        surface_reelle_bati: surface,
        code_postal: codePostal,
        prix_m2: prixM2,
        nombre_pieces: nbPieces
      };
    } catch (error) {
      return null;
    }
  }

  private parseDate(dateStr: string): string {
    // Convertir DD/MM/YYYY vers YYYY-MM-DD
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr; // Retourner tel quel si le format n'est pas reconnu
  }

  private isValidTransaction(transaction: DVFTransaction | null): transaction is DVFTransaction {
    if (!transaction) return false;

    return (
      transaction.surface_reelle_bati >= 9 &&
      transaction.surface_reelle_bati <= 400 &&
      transaction.prix_m2 >= 500 &&
      transaction.prix_m2 <= 15000 &&
      transaction.valeur_fonciere > 10000 &&
      (transaction.type_local.toLowerCase().includes('appartement') ||
       transaction.type_local.toLowerCase().includes('maison'))
    );
  }
}

export const progressiveDVFLoader = ProgressiveDVFLoader.getInstance();