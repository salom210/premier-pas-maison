import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Home, TrendingUp } from 'lucide-react';
import { analyzeDVFMarket } from '@/lib/dvf/marketAnalysisService';
import { loadDVFData } from '@/lib/dvf/dvfLoader';
import type { DVFTransaction } from '@/lib/dvf/dvfLoader';

export function RoomsPriorityTest() {
  const [codePostal, setCodePostal] = useState('93400');
  const [surface, setSurface] = useState(50);
  const [nombrePieces, setNombrePieces] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [transactions, setTransactions] = useState<DVFTransaction[]>([]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      // Charger les données DVF
      const dvfData = await loadDVFData();
      setTransactions(dvfData);
      
      // Analyser le marché
      const result = await analyzeDVFMarket(dvfData, {
        codePostal,
        ville: 'Test',
        surface,
        nombrePieces
      });
      
      setAnalysis(result);
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Test de priorité par nombre de pièces
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="codePostal">Code postal</Label>
              <Input
                id="codePostal"
                value={codePostal}
                onChange={(e) => setCodePostal(e.target.value)}
                placeholder="93400"
              />
            </div>
            <div>
              <Label htmlFor="surface">Surface (m²)</Label>
              <Input
                id="surface"
                type="number"
                value={surface}
                onChange={(e) => setSurface(Number(e.target.value))}
                placeholder="50"
              />
            </div>
            <div>
              <Label htmlFor="nombrePieces">Nombre de pièces</Label>
              <Input
                id="nombrePieces"
                type="number"
                value={nombrePieces}
                onChange={(e) => setNombrePieces(Number(e.target.value))}
                placeholder="3"
              />
            </div>
          </div>
          
          <Button onClick={handleAnalyze} disabled={isLoading} className="w-full">
            {isLoading ? 'Analyse en cours...' : 'Analyser le marché'}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <div className="space-y-4">
          {/* Résumé de l'analyse */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Résumé de l'analyse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysis.prix_moyen_m2_quartier?.toLocaleString('fr-FR')}€
                  </div>
                  <div className="text-sm text-gray-600">Prix moyen/m²</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysis.nombre_transactions_similaires}
                  </div>
                  <div className="text-sm text-gray-600">Transactions similaires</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysis.valeur_estimee_mediane?.toLocaleString('fr-FR')}€
                  </div>
                  <div className="text-sm text-gray-600">Valeur estimée</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {analysis.conclusion}
                  </div>
                  <div className="text-sm text-gray-600">Conclusion</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques par nombre de pièces */}
          {analysis.statistiques_pieces && (
            <Card className="bg-blue-50/50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analyse par nombre de pièces
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Résumé des correspondances */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-800">
                        {analysis.statistiques_pieces.correspondance_exacte}
                      </div>
                      <div className="text-xs text-blue-600">Correspondance exacte</div>
                      <div className="text-xs text-gray-500">
                        {analysis.statistiques_pieces.cible_pieces} pièces
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700">
                        {analysis.statistiques_pieces.correspondance_proche}
                      </div>
                      <div className="text-xs text-blue-600">Correspondance proche</div>
                      <div className="text-xs text-gray-500">±1 pièce</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {analysis.statistiques_pieces.total_transactions}
                      </div>
                      <div className="text-xs text-blue-600">Total transactions</div>
                      <div className="text-xs text-gray-500">Analysées</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">
                        {analysis.statistiques_pieces.groupes_pieces.length}
                      </div>
                      <div className="text-xs text-blue-600">Groupes de pièces</div>
                      <div className="text-xs text-gray-500">Différents</div>
                    </div>
                  </div>

                  {/* Détail par nombre de pièces */}
                  {analysis.statistiques_pieces.groupes_pieces.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 mb-3">
                        Prix moyen par nombre de pièces
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {analysis.statistiques_pieces.groupes_pieces.map((groupe: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-blue-800">{groupe.nombre_pieces} pièces</span>
                              <Badge 
                                variant={
                                  groupe.priorite === 'exacte' ? 'default' : 
                                  groupe.priorite === 'proche' ? 'secondary' : 'outline'
                                }
                                className="text-xs"
                              >
                                {groupe.priorite}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-blue-800">
                                {Math.round(groupe.prix_moyen_m2).toLocaleString('fr-FR')}€/m²
                              </div>
                              <div className="text-xs text-gray-500">
                                {groupe.nombre_transactions} transaction{groupe.nombre_transactions > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informations sur les données chargées */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Données chargées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <p>Total transactions DVF chargées : {transactions.length}</p>
                <p>Source : {analysis.source || 'DVF'}</p>
                <p>Dernière mise à jour : {new Date(analysis.derniere_maj).toLocaleString('fr-FR')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
