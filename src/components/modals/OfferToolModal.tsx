import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, TrendingUp, FileText, CheckCircle2, Home, BarChart3, Lightbulb, Loader2, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import type { Offre, OffreScenario, PropertyInfo, MarketAnalysis } from "@/types/project";
import { fetchMarketData, calculerProbabiliteAcceptation } from "@/services/dvfService";
import { MarketPositionChart } from "@/components/MarketPositionChart";
import { ScenarioCard } from "@/components/ScenarioCard";

interface OfferToolModalProps {
  open: boolean;
  onClose: () => void;
  offre: Offre;
  onUpdateOffre: (offre: Offre) => void;
  canProceed: boolean;
}

export function OfferToolModal({ 
  open, 
  onClose, 
  offre, 
  onUpdateOffre,
  canProceed 
}: OfferToolModalProps) {
  const [activeTab, setActiveTab] = useState<string>("bien");
  const [localOffre, setLocalOffre] = useState<Offre>(offre);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [addressSearch, setAddressSearch] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [openAddressPopover, setOpenAddressPopover] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLocalOffre(offre);
  }, [offre]);

  // Address autocomplete
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setAddressSuggestions(data.features || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
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
    }, 300);

    return () => clearTimeout(timer);
  }, [addressSearch, searchAddress]);

  const selectAddress = (feature: any) => {
    const props = feature.properties;
    
    setLocalOffre(prev => ({
      ...prev,
      property_info: {
        ...prev.property_info,
        adresse: props.name,
        code_postal: props.postcode,
        ville: props.city,
      }
    }));
    
    setAddressSearch(props.name);
    setOpenAddressPopover(false);
  };

  // Property Info handlers
  const updatePropertyInfo = (field: keyof PropertyInfo, value: any) => {
    setLocalOffre({
      ...localOffre,
      property_info: {
        ...(localOffre.property_info || {
          adresse: "",
          code_postal: "",
          ville: "",
          surface_habitable: 0,
          nombre_pieces: 0,
          nombre_chambres: 0,
          ascenseur: false,
          balcon_terrasse: false,
          parking: false,
          cave: false,
          etat: "bon",
          prix_demande: 0
        }),
        [field]: value
      } as PropertyInfo
    });
  };

  // Fetch market data
  const handleFetchMarketData = async () => {
    if (!localOffre.property_info) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir les informations du bien d'abord.",
        variant: "destructive"
      });
      return;
    }

    const { code_postal, ville, surface_habitable, nombre_pieces } = localOffre.property_info;
    
    if (!code_postal || !ville || !surface_habitable || !nombre_pieces) {
      toast({
        title: "Informations incomplètes",
        description: "Code postal, ville, surface et nombre de pièces sont requis.",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingMarket(true);
    try {
      const marketData = await fetchMarketData(
        code_postal,
        ville,
        surface_habitable,
        nombre_pieces
      );

      if (marketData) {
        // Calculer l'écart avec le prix demandé
        const ecart = localOffre.property_info.prix_demande 
          ? ((localOffre.property_info.prix_demande - marketData.valeur_estimee_mediane) / marketData.valeur_estimee_mediane) * 100
          : 0;

        marketData.ecart_prix_demande_vs_marche = Math.round(ecart);
        
        if (ecart < -5) marketData.conclusion = 'bonne-affaire';
        else if (ecart > 10) marketData.conclusion = 'survalorise';
        else marketData.conclusion = 'correct';

        setLocalOffre({
          ...localOffre,
          market_analysis: marketData
        });

        // Générer automatiquement les scénarios
        generateScenarios(marketData, localOffre.property_info);

        toast({
          title: "Analyse de marché récupérée",
          description: `${marketData.nombre_transactions_similaires} transactions similaires trouvées.`
        });

        setActiveTab("marche");
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de récupérer les données de marché.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la récupération des données.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMarket(false);
    }
  };

  // Generate scenarios based on market data
  const generateScenarios = (marketData: MarketAnalysis, propertyInfo: PropertyInfo) => {
    const valeurMediane = marketData.valeur_estimee_mediane;
    const valeurBasse = marketData.valeur_estimee_basse;
    const prixDemande = propertyInfo.prix_demande;

    const scenarios: OffreScenario[] = [
      {
        id: "conservative",
        nom: "Maximiser l'acceptation",
        strategie: "conservative",
        montant: Math.round(valeurMediane * 0.98),
        clauses: ["Obtention du prêt", "Diagnostics conformes"],
        delai_reponse: 48,
        commentaire: "Offre sérieuse avec financement validé",
        probabilite_acceptation: calculerProbabiliteAcceptation(
          valeurMediane * 0.98,
          prixDemande,
          valeurMediane,
          2,
          48,
          'equilibre'
        ),
        risque: "faible",
        plus_value_potentielle: "limitée",
        justification: "Offre proche de la valeur de marché avec clauses rassurantes"
      },
      {
        id: "balanced",
        nom: "Équilibré",
        strategie: "balanced",
        montant: Math.round(valeurMediane * 0.94),
        clauses: ["Obtention du prêt"],
        delai_reponse: 72,
        commentaire: "Marge de négociation raisonnable",
        probabilite_acceptation: calculerProbabiliteAcceptation(
          valeurMediane * 0.94,
          prixDemande,
          valeurMediane,
          1,
          72,
          'equilibre'
        ),
        risque: "modéré",
        plus_value_potentielle: "correcte",
        justification: "Négociation raisonnable avec marge de discussion"
      },
      {
        id: "aggressive",
        nom: "Maximiser la plus-value",
        strategie: "aggressive",
        montant: Math.round(valeurBasse * 0.95),
        clauses: ["Obtention du prêt"],
        delai_reponse: 96,
        commentaire: propertyInfo.etat === 'a-renover' 
          ? "Travaux de rénovation importants à prévoir" 
          : "Offre basse justifiée par l'analyse de marché",
        probabilite_acceptation: calculerProbabiliteAcceptation(
          valeurBasse * 0.95,
          prixDemande,
          valeurMediane,
          1,
          96,
          'equilibre'
        ),
        risque: "élevé",
        plus_value_potentielle: "importante",
        justification: "Offre basse mais défendable, nécessite contexte favorable"
      }
    ];

    setLocalOffre({
      ...localOffre,
      scenarios,
      scenario_actif: "balanced"
    });
  };

  const updateScenario = (scenarioId: string, field: keyof OffreScenario, value: any) => {
    const updatedScenarios = localOffre.scenarios.map(s => {
      if (s.id === scenarioId) {
        const updated = { ...s, [field]: value };
        
        // Recalculer la probabilité si le montant ou les clauses changent
        if (field === 'montant' || field === 'clauses' || field === 'delai_reponse') {
          if (localOffre.market_analysis && localOffre.property_info && updated.montant) {
            updated.probabilite_acceptation = calculerProbabiliteAcceptation(
              updated.montant,
              localOffre.property_info.prix_demande,
              localOffre.market_analysis.valeur_estimee_mediane,
              Array.isArray(updated.clauses) ? updated.clauses.length : 0,
              updated.delai_reponse,
              'equilibre'
            );
          }
        }
        
        return updated;
      }
      return s;
    });

    setLocalOffre({
      ...localOffre,
      scenarios: updatedScenarios
    });
  };

  const generateDraft = () => {
    const activeScenario = localOffre.scenarios.find(s => s.id === localOffre.scenario_actif);
    if (!activeScenario || !activeScenario.montant) return;

    const adresse = localOffre.property_info?.adresse || "[ADRESSE DU BIEN]";
    const clausesText = activeScenario.clauses.length > 0 
      ? `\n\nClauses suspensives :\n${activeScenario.clauses.map(c => `- ${c}`).join('\n')}`
      : '';

    let argumentaire = "";
    if (localOffre.market_analysis && activeScenario.strategie === "aggressive") {
      argumentaire = `\n\nJ'ai étudié le marché local et noté que des biens similaires se sont vendus entre ${localOffre.market_analysis.prix_min_m2} et ${localOffre.market_analysis.prix_moyen_m2_quartier}€/m². Mon offre reflète cette réalité de marché.`;
    }

    if (localOffre.property_info?.etat === 'a-renover') {
      argumentaire += `\n\nJ'ai pris en compte les travaux de rénovation nécessaires dans ma proposition.`;
    }

    const draft = `Bonjour,

Suite à ma visite du bien situé au ${adresse}, je souhaite vous soumettre une offre d'achat.

Montant proposé : ${activeScenario.montant.toLocaleString('fr-FR')} €${clausesText}

Délai de réponse souhaité : ${activeScenario.delai_reponse} heures
${argumentaire}
${activeScenario.commentaire ? `\nRemarques complémentaires :\n${activeScenario.commentaire}\n` : ''}
Je reste à votre disposition pour échanger sur cette proposition.

Cordialement,
[VOTRE NOM]`;

    setLocalOffre({ ...localOffre, draft });
    setActiveTab("draft");
  };

  const handleSave = () => {
    onUpdateOffre(localOffre);
    toast({
      title: "Sauvegardé",
      description: "Vos modifications ont été enregistrées."
    });
    onClose();
  };

  const getConclusionColor = (conclusion: string) => {
    switch (conclusion) {
      case 'bonne-affaire': return 'bg-success/10 text-success-foreground border-success/30';
      case 'survalorise': return 'bg-destructive/10 text-destructive-foreground border-destructive/30';
      default: return 'bg-warning/10 text-warning-foreground border-warning/30';
    }
  };

  const getConclusionLabel = (conclusion: string) => {
    switch (conclusion) {
      case 'bonne-affaire': return '🟢 Bonne affaire';
      case 'survalorise': return '🔴 Survalorisation';
      default: return '🟠 Prix correct';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <div className="p-6 border-b shrink-0">
          <DialogHeader>
            <DialogTitle>Outil d'aide à l'offre</DialogTitle>
            <DialogDescription>
              De l'analyse du bien à la génération de scénarios optimisés
            </DialogDescription>
          </DialogHeader>

          {!canProceed && (
            <div className="p-4 rounded-lg border border-warning/30 bg-warning/5 mt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Pré-requis non satisfaits
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Complétez tous les éléments critiques des étapes précédentes avant de préparer votre offre.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="bien">
              <Home className="h-4 w-4 mr-2" />
              Bien
            </TabsTrigger>
            <TabsTrigger value="marche" disabled={!localOffre.property_info}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Marché
            </TabsTrigger>
            <TabsTrigger value="scenarios" disabled={!localOffre.market_analysis}>
              <Lightbulb className="h-4 w-4 mr-2" />
              Scénarios
            </TabsTrigger>
            <TabsTrigger value="draft" disabled={!localOffre.market_analysis}>
              <FileText className="h-4 w-4 mr-2" />
              Draft
            </TabsTrigger>
            <TabsTrigger value="risks">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Risques
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: BIEN */}
          <TabsContent value="bien" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Localisation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="adresse">Adresse</Label>
                  <Popover open={openAddressPopover && addressSuggestions.length > 0} onOpenChange={setOpenAddressPopover}>
                    <PopoverAnchor asChild>
                      <div className="relative">
                        <Input
                          id="adresse"
                          value={addressSearch || localOffre.property_info?.adresse || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setAddressSearch(value);
                            searchAddress(value);
                            if (value.length >= 3) {
                              setOpenAddressPopover(true);
                            } else {
                              setOpenAddressPopover(false);
                            }
                          }}
                          onFocus={() => {
                            if (addressSearch.length >= 3 && addressSuggestions.length > 0) {
                              setOpenAddressPopover(true);
                            }
                          }}
                          placeholder="Ex: 26 Avenue Gabriel Péri"
                          className="pr-10"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                        />
                        {isLoadingAddress ? (
                          <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        ) : (
                          <MapPin className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        )}
                      </div>
                    </PopoverAnchor>
                    <PopoverContent className="w-[400px] p-0" align="start" sideOffset={5}>
                      <Command>
                        <CommandList>
                          {addressSuggestions.length === 0 && !isLoadingAddress && addressSearch.length >= 3 && (
                            <CommandEmpty>Aucune adresse trouvée</CommandEmpty>
                          )}
                          {addressSuggestions.length === 0 && addressSearch.length < 3 && (
                            <CommandEmpty>Tapez au moins 3 caractères</CommandEmpty>
                          )}
                          {addressSuggestions.length > 0 && (
                            <CommandGroup>
                              {addressSuggestions.map((suggestion) => (
                                <CommandItem
                                  key={suggestion.properties.id}
                                  value={suggestion.properties.label}
                                  onSelect={() => selectAddress(suggestion)}
                                  className="cursor-pointer"
                                >
                                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{suggestion.properties.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {suggestion.properties.postcode} {suggestion.properties.city}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-1">
                    Commencez à taper pour voir les suggestions
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="code_postal">Code postal</Label>
                    <Input
                      id="code_postal"
                      value={localOffre.property_info?.code_postal || ""}
                      onChange={(e) => updatePropertyInfo("code_postal", e.target.value)}
                      placeholder="75001"
                      className={localOffre.property_info?.code_postal ? "bg-muted/50" : ""}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Rempli automatiquement
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="ville">Ville</Label>
                    <Input
                      id="ville"
                      value={localOffre.property_info?.ville || ""}
                      onChange={(e) => updatePropertyInfo("ville", e.target.value)}
                      placeholder="Paris"
                      className={localOffre.property_info?.ville ? "bg-muted/50" : ""}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Remplie automatiquement
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Surfaces & Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="surface">Surface habitable (m²)</Label>
                    <Input
                      id="surface"
                      type="number"
                      value={localOffre.property_info?.surface_habitable || ""}
                      onChange={(e) => updatePropertyInfo("surface_habitable", parseFloat(e.target.value) || 0)}
                      placeholder="65"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pieces">Nombre de pièces</Label>
                    <Input
                      id="pieces"
                      type="number"
                      value={localOffre.property_info?.nombre_pieces || ""}
                      onChange={(e) => updatePropertyInfo("nombre_pieces", parseInt(e.target.value) || 0)}
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="chambres">Chambres</Label>
                    <Input
                      id="chambres"
                      type="number"
                      value={localOffre.property_info?.nombre_chambres || ""}
                      onChange={(e) => updatePropertyInfo("nombre_chambres", parseInt(e.target.value) || 0)}
                      placeholder="2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="etage">Étage (optionnel)</Label>
                    <Input
                      id="etage"
                      type="number"
                      value={localOffre.property_info?.etage || ""}
                      onChange={(e) => updatePropertyInfo("etage", parseInt(e.target.value) || undefined)}
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="surface_ext">Surface extérieure (m²)</Label>
                    <Input
                      id="surface_ext"
                      type="number"
                      value={localOffre.property_info?.surface_exterieure || ""}
                      onChange={(e) => updatePropertyInfo("surface_exterieure", parseFloat(e.target.value) || undefined)}
                      placeholder="10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Équipements & État</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ascenseur">Ascenseur</Label>
                    <Switch
                      id="ascenseur"
                      checked={localOffre.property_info?.ascenseur || false}
                      onCheckedChange={(checked) => updatePropertyInfo("ascenseur", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="balcon">Balcon/Terrasse</Label>
                    <Switch
                      id="balcon"
                      checked={localOffre.property_info?.balcon_terrasse || false}
                      onCheckedChange={(checked) => updatePropertyInfo("balcon_terrasse", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="parking">Parking</Label>
                    <Switch
                      id="parking"
                      checked={localOffre.property_info?.parking || false}
                      onCheckedChange={(checked) => updatePropertyInfo("parking", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cave">Cave</Label>
                    <Switch
                      id="cave"
                      checked={localOffre.property_info?.cave || false}
                      onCheckedChange={(checked) => updatePropertyInfo("cave", checked)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="etat">État général</Label>
                    <Select
                      value={localOffre.property_info?.etat || "bon"}
                      onValueChange={(value) => updatePropertyInfo("etat", value)}
                    >
                      <SelectTrigger id="etat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="bon">Bon</SelectItem>
                        <SelectItem value="a-renover">À rénover</SelectItem>
                        <SelectItem value="travaux-lourds">Travaux lourds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dpe">DPE (optionnel)</Label>
                    <Select
                      value={localOffre.property_info?.dpe || ""}
                      onValueChange={(value) => updatePropertyInfo("dpe", value)}
                    >
                      <SelectTrigger id="dpe">
                        <SelectValue placeholder="Non renseigné" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                        <SelectItem value="E">E</SelectItem>
                        <SelectItem value="F">F</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="annee">Année de construction (optionnel)</Label>
                  <Input
                    id="annee"
                    type="number"
                    value={localOffre.property_info?.annee_construction || ""}
                    onChange={(e) => updatePropertyInfo("annee_construction", parseInt(e.target.value) || undefined)}
                    placeholder="1980"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations financières</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prix_demande">Prix demandé par le vendeur (€)</Label>
                  <Input
                    id="prix_demande"
                    type="number"
                    value={localOffre.property_info?.prix_demande || ""}
                    onChange={(e) => updatePropertyInfo("prix_demande", parseFloat(e.target.value) || 0)}
                    placeholder="250000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="charges">Charges mensuelles (€)</Label>
                    <Input
                      id="charges"
                      type="number"
                      value={localOffre.property_info?.charges_mensuelles || ""}
                      onChange={(e) => updatePropertyInfo("charges_mensuelles", parseFloat(e.target.value) || undefined)}
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <Label htmlFor="taxe_fonciere">Taxe foncière annuelle (€)</Label>
                    <Input
                      id="taxe_fonciere"
                      type="number"
                      value={localOffre.property_info?.taxe_fonciere || ""}
                      onChange={(e) => updatePropertyInfo("taxe_fonciere", parseFloat(e.target.value) || undefined)}
                      placeholder="800"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                onClick={handleFetchMarketData}
                disabled={isLoadingMarket || !localOffre.property_info}
                size="lg"
              >
                {isLoadingMarket ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyser le marché
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: MARCHÉ */}
          <TabsContent value="marche" className="space-y-4 mt-4">
            {localOffre.market_analysis && localOffre.property_info && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      Position du bien sur le marché
                      <Badge variant="outline" className={getConclusionColor(localOffre.market_analysis.conclusion)}>
                        {getConclusionLabel(localOffre.market_analysis.conclusion)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MarketPositionChart
                      prixDemande={localOffre.property_info.prix_demande}
                      valeurBasse={localOffre.market_analysis.valeur_estimee_basse}
                      valeurHaute={localOffre.market_analysis.valeur_estimee_haute}
                      valeurMediane={localOffre.market_analysis.valeur_estimee_mediane}
                    />
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-muted-foreground">Prix moyen/m²</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">
                        {localOffre.market_analysis.prix_moyen_m2_quartier.toLocaleString('fr-FR')} €
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Dans le quartier</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-muted-foreground">Fourchette de marché</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold text-foreground">
                        {localOffre.market_analysis.valeur_estimee_basse.toLocaleString('fr-FR')} - {localOffre.market_analysis.valeur_estimee_haute.toLocaleString('fr-FR')} €
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Fourchette estimée</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-muted-foreground">Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">
                        {localOffre.market_analysis.nombre_transactions_similaires}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Biens similaires vendus</p>
                    </CardContent>
                  </Card>
                </div>

                {localOffre.market_analysis.ecart_prix_demande_vs_marche !== 0 && (
                  <Card className="bg-accent/5">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Analyse du prix demandé
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground">
                        Le prix demandé est{' '}
                        <span className={`font-semibold ${
                          localOffre.market_analysis.ecart_prix_demande_vs_marche > 0 
                            ? 'text-destructive' 
                            : 'text-success'
                        }`}>
                          {localOffre.market_analysis.ecart_prix_demande_vs_marche > 0 ? '+' : ''}
                          {localOffre.market_analysis.ecart_prix_demande_vs_marche}%
                        </span>
                        {' '}par rapport à la valeur médiane du marché.
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setActiveTab("scenarios")}>
                    Voir les scénarios d'offre
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* TAB 3: SCÉNARIOS */}
          <TabsContent value="scenarios" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              {localOffre.scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isActive={localOffre.scenario_actif === scenario.id}
                  onSelect={() => setLocalOffre({ ...localOffre, scenario_actif: scenario.id })}
                />
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Personnaliser le scénario : {localOffre.scenarios.find(s => s.id === localOffre.scenario_actif)?.nom}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(() => {
                  const activeScenario = localOffre.scenarios.find(s => s.id === localOffre.scenario_actif);
                  if (!activeScenario) return null;

                  return (
                    <>
                      <div>
                        <Label htmlFor="montant_custom">Montant de l'offre (€)</Label>
                        <Input
                          id="montant_custom"
                          type="number"
                          value={activeScenario.montant || ""}
                          onChange={(e) => updateScenario(activeScenario.id, "montant", parseFloat(e.target.value) || null)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="clauses_custom">Clauses suspensives (une par ligne)</Label>
                        <Textarea
                          id="clauses_custom"
                          value={activeScenario.clauses.join('\n')}
                          onChange={(e) => updateScenario(activeScenario.id, "clauses", e.target.value.split('\n').filter(c => c.trim()))}
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="delai_custom">Délai de réponse (heures)</Label>
                        <Input
                          id="delai_custom"
                          type="number"
                          value={activeScenario.delai_reponse}
                          onChange={(e) => updateScenario(activeScenario.id, "delai_reponse", parseInt(e.target.value) || 72)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="comment_custom">Commentaire additionnel</Label>
                        <Textarea
                          id="comment_custom"
                          value={activeScenario.commentaire}
                          onChange={(e) => updateScenario(activeScenario.id, "commentaire", e.target.value)}
                          rows={2}
                        />
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={generateDraft}>
                <FileText className="h-4 w-4 mr-2" />
                Générer le message d'offre
              </Button>
            </div>
          </TabsContent>

          {/* TAB 4: DRAFT */}
          <TabsContent value="draft" className="space-y-4 mt-4">
            {!localOffre.draft && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Aucun message généré. Retournez à l'onglet "Scénarios" pour générer votre offre.
                </p>
                <Button onClick={() => setActiveTab("scenarios")} variant="outline">
                  Retour aux scénarios
                </Button>
              </div>
            )}

            {localOffre.draft && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Message d'offre</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={localOffre.draft}
                    onChange={(e) => setLocalOffre({ ...localOffre, draft: e.target.value })}
                    rows={16}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Remplacez [VOTRE NOM] avant envoi. Le message est personnalisé selon votre scénario.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 5: RISQUES */}
          <TabsContent value="risks" className="space-y-4 mt-4">
            <Card className="border-warning/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning-foreground" />
                  Points de non-retour
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <p className="text-sm font-medium text-foreground mb-1">
                    ⛔ Après acceptation de l'offre
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Une fois l'offre acceptée, vous vous engagez juridiquement. Vous ne pourrez vous rétracter que dans les cas prévus par les clauses suspensives.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-sm font-medium text-foreground mb-1">
                    📝 Signature du compromis
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Le délai de rétractation de 10 jours commence à la signature du compromis de vente.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-sm font-medium text-foreground mb-1">
                    💰 Séquestre
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Le versement de la somme séquestrée (généralement 5-10% du prix) matérialise votre engagement.
                  </p>
                </div>
              </CardContent>
            </Card>

            {localOffre.market_analysis && localOffre.scenarios.find(s => s.id === localOffre.scenario_actif) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Risques du scénario "{localOffre.scenarios.find(s => s.id === localOffre.scenario_actif)?.nom}"
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const activeScenario = localOffre.scenarios.find(s => s.id === localOffre.scenario_actif);
                    if (!activeScenario) return null;

                    return (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={
                            activeScenario.risque === 'faible' 
                              ? 'bg-success/10 text-success-foreground border-success/30'
                              : activeScenario.risque === 'modéré'
                              ? 'bg-warning/10 text-warning-foreground border-warning/30'
                              : 'bg-destructive/10 text-destructive-foreground border-destructive/30'
                          }>
                            Risque {activeScenario.risque}
                          </Badge>
                          <Badge variant="outline">
                            {activeScenario.probabilite_acceptation}% de probabilité d'acceptation
                          </Badge>
                        </div>

                        {activeScenario.strategie === 'aggressive' && (
                          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                            <p className="text-sm font-medium text-foreground mb-1">⚠️ Offre potentiellement trop basse</p>
                            <p className="text-xs text-muted-foreground">
                              Le vendeur peut se sentir insulté et refuser toute négociation. Assurez-vous de bien justifier votre offre.
                            </p>
                          </div>
                        )}

                        {activeScenario.strategie === 'balanced' && (
                          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                            <p className="text-sm font-medium text-foreground mb-1">💡 Marge de négociation</p>
                            <p className="text-xs text-muted-foreground">
                              Le vendeur pourrait faire une contre-proposition. Définissez votre prix maximum avant d'entrer en négociation.
                            </p>
                          </div>
                        )}

                        {activeScenario.strategie === 'conservative' && (
                          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                            <p className="text-sm font-medium text-foreground mb-1">✅ Offre sécurisée</p>
                            <p className="text-xs text-muted-foreground">
                              Votre offre est proche de la valeur de marché, ce qui maximise vos chances d'acceptation.
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statut de l'offre</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Offre acceptée</p>
                    <p className="text-xs text-muted-foreground">
                      Marquez cette case uniquement après acceptation formelle
                    </p>
                  </div>
                  <Button
                    variant={localOffre.offre_acceptee ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLocalOffre({ ...localOffre, offre_acceptee: !localOffre.offre_acceptee })}
                  >
                    {localOffre.offre_acceptee ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Acceptée
                      </>
                    ) : (
                      "Marquer comme acceptée"
                    )}
                  </Button>
                </div>

                {localOffre.offre_acceptee && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          Engagement ferme
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vous êtes maintenant engagé juridiquement. Poursuivez vers l'étape "Compromis" pour finaliser.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>

        <div className="p-6 border-t border-border shrink-0">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              Sauvegarder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
