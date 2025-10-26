import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { loadDVFData } from "@/lib/dvf/dvfLoader";
import { analyzeDVFMarket, type DVFAnalysisParams } from "@/lib/dvf/marketAnalysisService";
import type { MarketAnalysis } from "@/types/project";

export function GeographicProximityTest() {
  const [codePostal, setCodePostal] = useState("93170");
  const [adresse, setAdresse] = useState("43, rue du Landy");
  const [ville, setVille] = useState("Bagnolet");
  const [surface, setSurface] = useState(49);
  const [nombrePieces, setNombrePieces] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MarketAnalysis | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Autocomplétion d'adresse
  const [addressSearch, setAddressSearch] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Fonction de recherche d'adresse
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&type=housenumber&autocomplete=1`
      );
      const data = await response.json();
      setAddressSuggestions(data.features || []);
    } catch (error) {
      console.error('Error searching address:', error);
      setAddressSuggestions([]);
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (addressSearch) {
        searchAddress(addressSearch);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [addressSearch, searchAddress]);

  const selectAddress = (address: any) => {
    const label = address.properties.label;
    const city = address.properties.city;
    const postcode = address.properties.postcode;
    
    setAdresse(label);
    setVille(city);
    setCodePostal(postcode);
    setAddressSearch("");
    setAddressSuggestions([]);
    setIsPopoverOpen(false);
  };

  const runTest = async () => {
    console.log("🚀 Starting geographic proximity test...");
    setIsLoading(true);
    setResults(null);
    setDebugInfo(null);

    try {
      console.log("📥 Loading DVF data...");
      const dvfData = await loadDVFData();
      console.log("📊 DVF Data loaded:", dvfData.length, "transactions");

      const params: DVFAnalysisParams = {
        codePostal,
        ville,
        surface,
        nombrePieces,
        adresse, // Passer l'adresse pour le scoring géographique
        additionalInfo: {
          prix_demande: 350000
        }
      };

      console.log("🔍 Testing with params:", params);

      console.log("🔬 Running market analysis...");
      const analysis = await analyzeDVFMarket(dvfData, params);
      
      if (analysis) {
        console.log("✅ Analysis completed:", analysis);
        setResults(analysis);
        
    // Extraire les informations de debug
    const transactionsWithAddress = analysis.transactions_similaires || [];
    const topTransactions = transactionsWithAddress.slice(0, 10);
    
    // Pour afficher les scores, il faudrait avoir accès aux transactions scores
    // Pour l'instant, on crée des copies enrichies
    const top10WithScores = topTransactions.map(t => ({
      ...t,
      // Données de debug
      adresse_complete: t.adresse,
      prix_m2_calculé: Math.round(t.prix_vente / t.surface),
      distance_m: t.distance_km ? Math.round(t.distance_km * 1000) : null
    }));
    
    const debugData = {
      total_similaires: transactionsWithAddress.length,
      top_10: top10WithScores,
      prix_moyen_m2: analysis.prix_moyen_m2_exact || analysis.prix_moyen_m2_quartier,
      fiabilite: analysis.fiabilite_estimation,
      fiabilite_nombre_transactions: transactionsWithAddress.length,
      fiabilite_score_moyen: "Calculé côté backend"
    };
        
        setDebugInfo(debugData);
        console.log("📊 Debug info:", debugData);
        console.log("📍 Top 10 transactions (avec adresses complètes):", top10WithScores.map(t => ({
          adresse: t.adresse,
          prix_m2: t.prix_m2_calculé,
          surface: t.surface,
          pieces: t.nombre_pieces
        })));
      } else {
        console.log("❌ No analysis returned");
      }
    } catch (error) {
      console.error("❌ Test error:", error);
      alert(`Erreur lors du test: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
      console.log("✅ Test completed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="adresse-search">Adresse du bien</Label>
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverAnchor asChild>
              <div className="relative">
                <Input
                  id="adresse-search"
                  value={addressSearch}
                  onChange={(e) => {
                    setAddressSearch(e.target.value);
                    setIsPopoverOpen(true);
                  }}
                  onFocus={() => setIsPopoverOpen(true)}
                  placeholder="Tapez une adresse (ex: 43 rue du Landy)..."
                  disabled={isLoadingAddress}
                />
                {isLoadingAddress && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </PopoverAnchor>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandList>
                  {addressSuggestions.length === 0 && !isLoadingAddress && addressSearch.length >= 3 && (
                    <CommandEmpty>Aucune adresse trouvée.</CommandEmpty>
                  )}
                  {addressSuggestions.map((suggestion, index) => (
                    <CommandItem
                      key={index}
                      value={suggestion.properties.label}
                      onSelect={() => selectAddress(suggestion)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{suggestion.properties.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {suggestion.properties.postcode} {suggestion.properties.city}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label htmlFor="codePostal">Code postal</Label>
          <Input
            id="codePostal"
            value={codePostal}
            onChange={(e) => setCodePostal(e.target.value)}
            placeholder="93170"
          />
        </div>
        <div>
          <Label htmlFor="ville">Ville</Label>
          <Input
            id="ville"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Bagnolet"
          />
        </div>
        <div>
          <Label htmlFor="surface">Surface habitable (m²)</Label>
          <Input
            id="surface"
            type="number"
            value={surface}
            onChange={(e) => setSurface(Number(e.target.value))}
            placeholder="49"
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

      <Button 
        onClick={() => {
          console.log("🎯 Button clicked!");
          runTest();
        }} 
        disabled={isLoading} 
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Test en cours...
          </>
        ) : (
          <>
            <MapPin className="mr-2 h-4 w-4" />
            Tester la priorisation géographique
          </>
        )}
      </Button>

      {results && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Résultats de l'analyse</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Prix moyen / m²</p>
                <p className="text-2xl font-bold">
                  {Math.round(results.prix_moyen_m2_exact || results.prix_moyen_m2_quartier).toLocaleString('fr-FR')} €/m²
                </p>
                {adresse && (
                  <p className="text-xs text-muted-foreground">
                    Moyenne pondérée sur les 50 meilleures transactions (proximité géographique)
                  </p>
                )}
                {!adresse && (
                  <p className="text-xs text-muted-foreground">
                    Prix moyen sur {results.nombre_transactions_similaires} transactions
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valeur estimée</p>
                <p className="text-2xl font-bold">
                  {results.valeur_estimee_mediane.toLocaleString('fr-FR')} €
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions similaires</p>
                <p className="text-2xl font-bold">{results.nombre_transactions_similaires}</p>
                <Badge variant="outline" className="mt-2">
                  Fiabilité {results.fiabilite_estimation}
                </Badge>
              </div>
            </div>

            {debugInfo && (
              <div className="space-y-6">
                {/* Critères de priorisation */}
                <Card className="bg-blue-50/50 border-blue-200">
                  <CardContent className="pt-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Critères de priorisation des transactions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-blue-900 mb-1">📍 Proximité géographique (60%)</p>
                        <ul className="text-xs text-blue-800 space-y-0.5">
                          <li>• 0-50m : Score 100</li>
                          <li>• 51-100m : Score 95</li>
                          <li>• 101-250m : Score 85</li>
                          <li>• 251-500m : Score 70</li>
                          <li>• &gt;500m : Score 50</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-green-700 mb-1">🚪 Nombre de pièces (25%)</p>
                        <ul className="text-xs text-green-700 space-y-0.5">
                          <li>• Correspondance exacte préférée</li>
                          <li>• ±1 pièce accepté</li>
                          <li>• Pondération dégressive</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-purple-700 mb-1">📐 Surface (15%)</p>
                        <ul className="text-xs text-purple-700 space-y-0.5">
                          <li>• Filtre ±40m² initialement</li>
                          <li>• Priorité aux plus proches</li>
                          <li>• Avec code postal précis</li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs text-blue-700">
                        <span className="font-medium">Calcul du prix moyen :</span> Moyenne pondérée sur {results.nombre_transactions_similaires} transactions selon leur score combiné
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Top 10 transactions */}
                <div>
                  <h4 className="font-semibold mb-3">Top 10 transactions similaires (priorisées par proximité géographique)</h4>
                <div className="space-y-2">
                  {debugInfo.top_10.map((transaction: any, index: number) => (
                    <Card key={transaction.id} className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">#{index + 1} - {transaction.adresse}</p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.surface}m² • {transaction.nombre_pieces} pièces • {transaction.prix_vente.toLocaleString('fr-FR')} €
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vente le {new Date(transaction.date_vente).toLocaleDateString('fr-FR')}
                            {transaction.distance_m !== null && transaction.distance_m !== undefined && (
                              <span className="ml-2 text-blue-600 font-medium">
                                📍 {transaction.distance_m}m
                              </span>
                            )}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {(transaction.prix_vente / transaction.surface).toFixed(0)} €/m²
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

