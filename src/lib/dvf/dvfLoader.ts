import Papa from 'papaparse';

export interface DVFTransaction {
  id: string;
  date_mutation: string;
  valeur_fonciere: number;
  type_local: string;
  surface_reelle_bati: number;
  code_postal: string;
  prix_m2: number;
  nombre_pieces: number;
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

class DVFCache {
  private static instance: DVFCache;
  private data: DVFTransaction[] | null = null;
  private lastLoadTime: number = 0;
  private dataSource: string = '2025';
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_TRANSACTIONS = 10000;
  private readonly SMART_ANALYSIS_LIMIT = 1000;

  private constructor() {}

  static getInstance(): DVFCache {
    if (!DVFCache.instance) {
      DVFCache.instance = new DVFCache();
    }
    return DVFCache.instance;
  }

  async getData(): Promise<DVFTransaction[]> {
    if (this.data && this.isCacheValid()) {
      console.log('Using cached DVF data');
      return this.data;
    }

    console.log('Loading fresh DVF data...');
    this.data = await this.loadCSVData();
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

  private async loadCSVData(): Promise<DVFTransaction[]> {
    // Essayer d'abord le fichier principal avec analyse intelligente
    let transactions: DVFTransaction[] = [];
    this.dataSource = '2025'; // Réinitialiser à 2025 par défaut
    
    try {
      console.log('Loading primary file (2025 data) with smart analysis...');
      transactions = await this.loadCSVFileWithSmartAnalysis('/mutations_d93_2025.csv');
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
      try {
        const fallbackTransactions = await this.loadCSVFileWithSmartAnalysis('/mutations_d93_2024.csv');
        console.log('Fallback file loaded, transactions:', fallbackTransactions.length);
        
        if (fallbackTransactions.length > 0) {
          transactions = fallbackTransactions;
          this.dataSource = '2024';
        }
      } catch (error) {
        console.error('Failed to load fallback file:', error);
        if (transactions.length === 0) {
          throw new Error('Both DVF files failed to load');
        }
      }
    }
    
    return transactions;
  }

  private async loadCSVFile(filePath: string): Promise<DVFTransaction[]> {
    try {
      console.log(`Loading DVF CSV data from ${filePath}...`);
      const response = await fetch(filePath);
      console.log('CSV response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to load DVF data from ${filePath}: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();
      console.log('CSV text length:', csvText.length);
      console.log('CSV first 200 chars:', csvText.substring(0, 200));
      
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
            
            // Traitement par chunks
            for (const row of results.data) {
              const transaction = this.parseRow(row);
              if (transaction && this.isValidTransaction(transaction)) {
                validTransactions.push(transaction);
                validCount++;
              }
              processedCount++;
              
              // Arrêter si on a atteint la limite
              if (validTransactions.length >= this.MAX_TRANSACTIONS) {
                console.log(`Reached max transactions limit (${this.MAX_TRANSACTIONS}), stopping processing`);
                parser.abort();
                break;
              }
            }
          },
          complete: (results) => {
            try {
              console.log('CSV parsing completed, total rows processed:', processedCount);
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

  private async loadCSVFileWithSmartAnalysis(filePath: string): Promise<DVFTransaction[]> {
    try {
      console.log(`Loading DVF CSV data from ${filePath} with smart analysis (first ${this.SMART_ANALYSIS_LIMIT} rows)...`);
      const response = await fetch(filePath);
      console.log('CSV response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to load DVF data from ${filePath}: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();
      console.log('CSV text length:', csvText.length);

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
      // Log the first few rows for debugging
      if (Math.random() < 0.001) { // Log 0.1% of rows
        console.log('Sample row being parsed:', row);
      }

      // Utiliser directement le code postal (plus besoin d'extraire depuis l_codinsee)
      const codePostal = row.code_postal;
      if (!codePostal || codePostal.length !== 5) {
        if (Math.random() < 0.01) { // Log 1% of invalid postal codes
          console.log('Invalid postal code:', codePostal);
        }
        return null;
      }

      // Parser la valeur foncière (format français: "468000,00" → 468000.00)
      const valeurFonciere = parseFloat(row.valeurfonc.replace(',', '.'));
      if (isNaN(valeurFonciere) || valeurFonciere <= 0) {
        if (Math.random() < 0.01) { // Log 1% of invalid values
          console.log('Invalid valeur fonciere:', { valeurFonciere, original: row.valeurfonc });
        }
        return null;
      }

      // Parser la surface (format français: "48,00" → 48.00)
      const surface = parseFloat(row.sbatapt.replace(',', '.'));
      if (isNaN(surface) || surface <= 0) {
        if (Math.random() < 0.01) { // Log 1% of invalid values
          console.log('Invalid surface:', { surface, original: row.sbatapt });
        }
        return null;
      }

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
      console.warn('Error parsing DVF row:', error, row);
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

    // Filter criteria as specified in the plan
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

export const dvfCache = DVFCache.getInstance();

export async function loadDVFData(): Promise<DVFTransaction[]> {
  return await dvfCache.getData();
}