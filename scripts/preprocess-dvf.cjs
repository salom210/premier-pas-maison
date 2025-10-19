const fs = require('fs');
const readline = require('readline');

const inputFile2025 = './public/ValeursFoncieres-2025-S1.txt';
const outputFile2025 = './public/mutations_d93_2025.csv';
const inputFile2024 = './public/ValeursFoncieres-2024.txt';
const outputFile2024 = './public/mutations_d93_2024.csv';
const targetDepartment = '93';
const delimiter = '|';

// Colonnes à extraire (positions dans le fichier pipe-delimited)
const COLUMN_INDICES = {
  idmutation: 7,      // "No disposition" (position 7)
  datemut: 8,         // "Date mutation" (position 8)
  valeurfonc: 10,     // "Valeur fonciere" (position 10)
  libtypbien: 36,     // "Type local" (position 36)
  sbatapt: 38,        // "Surface reelle bati" (position 38)
  code_postal: 16,    // "Code postal" (position 16)
  nbapt1pp: 39,       // "Nombre pieces principales" (position 39)
  code_departement: 18 // "Code departement" (position 18)
};

function parseLine(line) {
  const columns = line.split('|');
  const row = {};
  
  for (const [key, index] of Object.entries(COLUMN_INDICES)) {
    row[key] = columns[index] || '';
  }
  
  return row;
}

function formatValue(value, type) {
  switch (type) {
    case 'valeurfonc':
      return value.replace(',', '.');
    case 'sbatapt':
      return value.replace(',', '.');
    default:
      return value.trim();
  }
}

function isValidRow(row) {
  // Vérifier que c'est le département 93
  if (row.code_departement !== '93') return false;
  
  // Vérifier que les champs essentiels ne sont pas vides
  if (!row.idmutation || !row.datemut || !row.valeurfonc) return false;
  
  // Vérifier que c'est un appartement ou une maison
  if (!row.libtypbien || (!row.libtypbien.toLowerCase().includes('appartement') && 
                          !row.libtypbien.toLowerCase().includes('maison'))) return false;
  
  return true;
}

async function processFile(inputPath, outputPath, year) {
  console.log(`🔄 Traitement du fichier ${inputPath}...`);
  
  const fileStream = fs.createReadStream(inputPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let header = '';
  const filteredLines = [];
  let lineCount = 0;
  let filteredCount = 0;

  for await (const line of rl) {
    lineCount++;
    if (lineCount === 1) {
      header = line;
      // Créer l'en-tête CSV
      const csvHeader = [
        'idmutation',
        'datemut', 
        'valeurfonc',
        'libtypbien',
        'sbatapt',
        'code_postal',
        'nbapt1pp'
      ].join(';');
      filteredLines.push(csvHeader);
      continue;
    }

    try {
      const row = parseLine(line);
      
      if (isValidRow(row)) {
        // Formater les valeurs
        const formattedRow = {
          idmutation: row.idmutation,
          datemut: row.datemut,
          valeurfonc: formatValue(row.valeurfonc, 'valeurfonc'),
          libtypbien: row.libtypbien,
          sbatapt: formatValue(row.sbatapt, 'sbatapt'),
          code_postal: row.code_postal,
          nbapt1pp: row.nbapt1pp
        };

        // Créer la ligne CSV
        const csvLine = [
          formattedRow.idmutation,
          formattedRow.datemut,
          formattedRow.valeurfonc,
          formattedRow.libtypbien,
          formattedRow.sbatapt,
          formattedRow.code_postal,
          formattedRow.nbapt1pp
        ].join(';');

        filteredLines.push(csvLine);
        filteredCount++;
      }
    } catch (error) {
      console.warn(`Erreur ligne ${lineCount}:`, error.message);
    }

    if (lineCount % 100000 === 0) {
      console.log(`  📊 ${lineCount.toLocaleString()} lignes traitées, ${filteredCount.toLocaleString()} transactions valides trouvées...`);
    }
  }

  // Écrire le fichier de sortie
  fs.writeFileSync(outputPath, filteredLines.join('\n'), 'utf8');
  
  console.log(`✅ Fichier ${inputPath} traité:`);
  console.log(`   - Lignes totales: ${lineCount.toLocaleString()}`);
  console.log(`   - Transactions valides (93): ${filteredCount.toLocaleString()}`);
  console.log(`   - Fichier de sortie: ${outputPath}`);
}

async function runPreprocessing() {
  console.log('🚀 Début du pré-traitement des fichiers DVF nationaux');
  console.log('====================================================');
  
  await processFile(inputFile2025, outputFile2025, '2025');
  await processFile(inputFile2024, outputFile2024, '2024');
  
  console.log('\n🎉 Pré-traitement terminé !');
  console.log('Les fichiers filtrés sont prêts dans le dossier public/');
}

runPreprocessing().catch(console.error);