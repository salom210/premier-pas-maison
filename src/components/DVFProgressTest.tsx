import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2, BarChart3 } from 'lucide-react';
import { progressiveDVFLoader } from '@/lib/dvf/progressiveLoader';
import type { LoadingProgress } from '@/lib/dvf/progressiveLoader';

export function DVFProgressTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<LoadingProgress | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setIsLoading(true);
    setProgress(null);
    setResult(null);
    setError(null);

    try {
      const transactions = await progressiveDVFLoader.getData((progress) => {
        setProgress(progress);
        console.log('Progress update:', progress);
      });
      
      const dataSource = progressiveDVFLoader.getDataSource();
      
      setResult({
        transactions: transactions,
        count: transactions.length,
        dataSource: dataSource,
        sample: transactions.slice(0, 3)
      });
      
      console.log('DVF Progress Test Result:', {
        count: transactions.length,
        dataSource: dataSource,
        sample: transactions.slice(0, 3)
      });
    } catch (err) {
      console.error('DVF Progress Test Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (stage: string) => {
    switch (stage) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'loading':
      case 'parsing':
      case 'filtering':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Test du chargement progressif DVF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Ce test vérifie le chargement progressif des données DVF avec suivi en temps réel.
          </p>
          
          <Button onClick={handleTest} disabled={isLoading} className="w-full">
            {isLoading ? 'Test en cours...' : 'Lancer le test de chargement progressif'}
          </Button>
        </CardContent>
      </Card>

      {/* Progress */}
      {progress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {getStatusIcon(progress.stage)}
              Progression du chargement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{progress.message}</span>
            </div>
            
            <Progress value={progress.progress} className="w-full" />
            
            <div className="text-sm text-gray-600">
              <p>Progression: {progress.progress}%</p>
              {progress.totalRows && <p>Lignes traitées: {progress.totalRows.toLocaleString()}</p>}
              {progress.transactionsLoaded && <p>Transactions valides: {progress.transactionsLoaded.toLocaleString()}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Erreur de chargement</span>
            </div>
            <p className="text-sm text-red-600 mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Chargement réussi</span>
            </div>
            
            <div className="mt-4 space-y-2">
              <p className="text-sm">
                <span className="font-medium">Source de données:</span> {result.dataSource}
              </p>
              <p className="text-sm">
                <span className="font-medium">Nombre de transactions:</span> {result.count.toLocaleString()}
              </p>
              
              {result.sample && result.sample.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Échantillon de transactions:</p>
                  <div className="space-y-2">
                    {result.sample.map((transaction: any, index: number) => (
                      <div key={index} className="text-xs bg-white p-2 rounded border">
                        <p><strong>ID:</strong> {transaction.id}</p>
                        <p><strong>Code postal:</strong> {transaction.code_postal}</p>
                        <p><strong>Surface:</strong> {transaction.surface_reelle_bati}m²</p>
                        <p><strong>Prix/m²:</strong> {Math.round(transaction.prix_m2).toLocaleString('fr-FR')}€</p>
                        <p><strong>Pièces:</strong> {transaction.nombre_pieces}</p>
                        <p><strong>Date:</strong> {transaction.date_mutation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
