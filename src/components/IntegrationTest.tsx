import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, TestTube, AlertTriangle } from 'lucide-react';
import { loadDVFData } from '@/lib/dvf/dvfLoader';
import { progressiveDVFLoader } from '@/lib/dvf/progressiveLoader';
import { analyzeDVFMarket } from '@/lib/dvf/marketAnalysisService';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  details?: any;
}

export function IntegrationTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    const tests: TestResult[] = [
      { name: 'Chargement DVF standard', status: 'pending' },
      { name: 'Chargement DVF progressif', status: 'pending' },
      { name: 'Analyse de marché', status: 'pending' },
      { name: 'Priorité par nombre de pièces', status: 'pending' },
      { name: 'Fallback 2025→2024', status: 'pending' },
      { name: 'Correspondance exacte code postal', status: 'pending' }
    ];

    setResults([...tests]);

    // Test 1: Chargement DVF standard
    try {
      setResults(prev => prev.map(r => r.name === 'Chargement DVF standard' ? { ...r, status: 'running' } : r));
      
      const dvfData = await loadDVFData();
      const dataSource = dvfData.length > 0 ? 'DVF' : 'Unknown';
      
      setResults(prev => prev.map(r => 
        r.name === 'Chargement DVF standard' 
          ? { 
              ...r, 
              status: 'success', 
              message: `${dvfData.length.toLocaleString()} transactions chargées`,
              details: { count: dvfData.length, dataSource }
            } 
          : r
      ));
    } catch (error) {
      setResults(prev => prev.map(r => 
        r.name === 'Chargement DVF standard' 
          ? { ...r, status: 'error', message: error instanceof Error ? error.message : 'Erreur inconnue' } 
          : r
      ));
    }

    // Test 2: Chargement DVF progressif
    try {
      setResults(prev => prev.map(r => r.name === 'Chargement DVF progressif' ? { ...r, status: 'running' } : r));
      
      const progressData = await progressiveDVFLoader.getData();
      const progressDataSource = progressiveDVFLoader.getDataSource();
      
      setResults(prev => prev.map(r => 
        r.name === 'Chargement DVF progressif' 
          ? { 
              ...r, 
              status: 'success', 
              message: `${progressData.length.toLocaleString()} transactions chargées`,
              details: { count: progressData.length, dataSource: progressDataSource }
            } 
          : r
      ));
    } catch (error) {
      setResults(prev => prev.map(r => 
        r.name === 'Chargement DVF progressif' 
          ? { ...r, status: 'error', message: error instanceof Error ? error.message : 'Erreur inconnue' } 
          : r
      ));
    }

    // Test 3: Analyse de marché
    try {
      setResults(prev => prev.map(r => r.name === 'Analyse de marché' ? { ...r, status: 'running' } : r));
      
      const dvfData = await loadDVFData();
      const analysis = analyzeDVFMarket(dvfData, {
        codePostal: '93400',
        ville: 'Test',
        surface: 50,
        nombrePieces: 3
      });
      
      setResults(prev => prev.map(r => 
        r.name === 'Analyse de marché' 
          ? { 
              ...r, 
              status: 'success', 
              message: `Analyse réussie - ${analysis.nombre_transactions_similaires} transactions similaires`,
              details: { 
                prixMoyen: analysis.prix_moyen_m2_quartier,
                transactionsSimilaires: analysis.nombre_transactions_similaires,
                conclusion: analysis.conclusion
              }
            } 
          : r
      ));
    } catch (error) {
      setResults(prev => prev.map(r => 
        r.name === 'Analyse de marché' 
          ? { ...r, status: 'error', message: error instanceof Error ? error.message : 'Erreur inconnue' } 
          : r
      ));
    }

    // Test 4: Priorité par nombre de pièces
    try {
      setResults(prev => prev.map(r => r.name === 'Priorité par nombre de pièces' ? { ...r, status: 'running' } : r));
      
      const dvfData = await loadDVFData();
      const analysis = analyzeDVFMarket(dvfData, {
        codePostal: '93400',
        ville: 'Test',
        surface: 50,
        nombrePieces: 3
      });
      
      const hasRoomStats = analysis.statistiques_pieces && 
                          analysis.statistiques_pieces.groupes_pieces && 
                          analysis.statistiques_pieces.groupes_pieces.length > 0;
      
      setResults(prev => prev.map(r => 
        r.name === 'Priorité par nombre de pièces' 
          ? { 
              ...r, 
              status: hasRoomStats ? 'success' : 'error', 
              message: hasRoomStats 
                ? `${analysis.statistiques_pieces.groupes_pieces.length} groupes de pièces analysés`
                : 'Statistiques par pièces non disponibles',
              details: hasRoomStats ? {
                groupesPieces: analysis.statistiques_pieces.groupes_pieces.length,
                correspondanceExacte: analysis.statistiques_pieces.correspondance_exacte,
                correspondanceProche: analysis.statistiques_pieces.correspondance_proche
              } : null
            } 
          : r
      ));
    } catch (error) {
      setResults(prev => prev.map(r => 
        r.name === 'Priorité par nombre de pièces' 
          ? { ...r, status: 'error', message: error instanceof Error ? error.message : 'Erreur inconnue' } 
          : r
      ));
    }

    // Test 5: Fallback 2025→2024
    try {
      setResults(prev => prev.map(r => r.name === 'Fallback 2025→2024' ? { ...r, status: 'running' } : r));
      
      // Test avec un code postal qui n'existe pas dans 2025 pour forcer le fallback
      const dvfData = await loadDVFData();
      const analysis = analyzeDVFMarket(dvfData, {
        codePostal: '99999', // Code postal inexistant
        ville: 'Test',
        surface: 50,
        nombrePieces: 3
      });
      
      const usedFallback = analysis.source === '2024' || analysis.message?.includes('2024');
      
      setResults(prev => prev.map(r => 
        r.name === 'Fallback 2025→2024' 
          ? { 
              ...r, 
              status: usedFallback ? 'success' : 'error', 
              message: usedFallback 
                ? 'Fallback vers 2024 fonctionne'
                : 'Fallback non déclenché',
              details: { 
                source: analysis.source,
                message: analysis.message
              }
            } 
          : r
      ));
    } catch (error) {
      setResults(prev => prev.map(r => 
        r.name === 'Fallback 2025→2024' 
          ? { ...r, status: 'error', message: error instanceof Error ? error.message : 'Erreur inconnue' } 
          : r
      ));
    }

    // Test 6: Correspondance exacte code postal
    try {
      setResults(prev => prev.map(r => r.name === 'Correspondance exacte code postal' ? { ...r, status: 'running' } : r));
      
      const dvfData = await loadDVFData();
      const analysis = analyzeDVFMarket(dvfData, {
        codePostal: '93400',
        ville: 'Test',
        surface: 50,
        nombrePieces: 3
      });
      
      const hasExactMatch = analysis.nombre_transactions_similaires > 0;
      
      setResults(prev => prev.map(r => 
        r.name === 'Correspondance exacte code postal' 
          ? { 
              ...r, 
              status: hasExactMatch ? 'success' : 'error', 
              message: hasExactMatch 
                ? `${analysis.nombre_transactions_similaires} transactions trouvées`
                : 'Aucune transaction trouvée',
              details: { 
                transactionsSimilaires: analysis.nombre_transactions_similaires,
                codePostal: '93400'
              }
            } 
          : r
      ));
    } catch (error) {
      setResults(prev => prev.map(r => 
        r.name === 'Correspondance exacte code postal' 
          ? { ...r, status: 'error', message: error instanceof Error ? error.message : 'Erreur inconnue' } 
          : r
      ));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'running':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const totalCount = results.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Tests d'intégration complets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Ces tests automatisés vérifient l'intégration de toutes les fonctionnalités 
            de migration DVF nationale et de priorité par nombre de pièces.
          </p>
          
          <Button onClick={runTests} disabled={isRunning} className="w-full">
            {isRunning ? 'Tests en cours...' : 'Lancer tous les tests'}
          </Button>
        </CardContent>
      </Card>

      {/* Résumé des tests */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Résumé des tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{successCount}</div>
                <div className="text-sm text-gray-600">Réussis</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                <div className="text-sm text-gray-600">Échecs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Détail des tests */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <Card key={index} className={getStatusColor(result.status)}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h4 className="font-medium">{result.name}</h4>
                      {result.message && (
                        <p className="text-sm text-gray-600">{result.message}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {result.details && (
                  <div className="mt-3 text-xs text-gray-500">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Instructions */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <strong>Note :</strong> Ces tests utilisent les vraies données DVF du département 93. 
              Certains tests peuvent prendre quelques secondes à s'exécuter selon la taille des fichiers.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
