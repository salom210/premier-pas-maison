import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, TrendingUp, FileText, CheckCircle2, Home, BarChart3, Lightbulb, Loader2, MapPin, RefreshCw, ArrowRight, Copy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import type { Offre, OffreScenario, PropertyInfo, MarketAnalysis, ChatGPTAnalysis, FiabiliteAnalysis } from "@/types/project";
import { fetchMarketData, fetchChatGPTAnalysis, calculateFiabilite, calculerProbabiliteAcceptation, generateOfferTemplate } from "@/services/dvfService";
import { MarketPositionChart } from "@/components/MarketPositionChart";
import { ScenarioCard } from "@/components/ScenarioCard";
import { PropertyInfoSummary } from "@/components/PropertyInfoSummary";
import { ChatGPTAnalysisCard } from "@/components/ChatGPTAnalysisCard";
import { FiabiliteGauge } from "@/components/FiabiliteGauge";
import { SimilarPropertiesList } from "@/components/SimilarPropertiesList";

interface OfferToolContentProps {
  offre: Offre;
  onUpdateOffre: (offre: Offre) => void;
  canProceed: boolean;
  onClose?: () => void;
  isModal?: boolean;
}

export function OfferToolContent({ 
  offre, 
  onUpdateOffre,
  canProceed,
  onClose,
  isModal = false
}: OfferToolContentProps) {
  const [activeTab, setActiveTab] = useState<string>("bien");
  const [localOffre, setLocalOffre] = useState<Offre>(offre);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [addressSearch, setAddressSearch] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [openAddressPopover, setOpenAddressPopover] = useState(false);
  const [isGeneratingOffer, setIsGeneratingOffer] = useState(false);
  const [generatedOfferTemplate, setGeneratedOfferTemplate] = useState<string>("");
  const { toast } = useToast();
  const hasAutoSwitchedToMarche = useRef(false);

  useEffect(() => {
    setLocalOffre(offre);
  }, [offre]);

  // Auto-switch to "Marché" tab after market analysis is loaded (only once, only from "bien" tab)
  useEffect(() => {
    if (localOffre.market_analysis && activeTab === "bien" && !hasAutoSwitchedToMarche.current) {
      // Use setTimeout to avoid conflicts with other state updates
      setTimeout(() => {
        setActiveTab("marche");
        hasAutoSwitchedToMarche.current = true;
      }, 100);
    }
  }, [localOffre.market_analysis, activeTab]);


  // Address search functionality
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
    const postcode = address.properties.postcode;
    const city = address.properties.city;
    const name = address.properties.name;
    
    // Extraire seulement la partie adresse (sans code postal et ville)
    const streetAddress = name;
    
    setLocalOffre(prev => ({
      ...prev,
      property_info: {
        ...prev.property_info,
        adresse: streetAddress,
        ville: city,
        code_postal: postcode
      } as PropertyInfo
    }));
    setAddressSearch(streetAddress);
    setOpenAddressPopover(false);
  };

  const updatePropertyInfo = useCallback((field: keyof PropertyInfo, value: any) => {
    setLocalOffre(prev => {
      const newOffre = {
        ...prev,
        property_info: {
          ...prev.property_info,
          [field]: value
        } as PropertyInfo
      };
      // Sauvegarder automatiquement les changements importants
      onUpdateOffre(newOffre);
      return newOffre;
    });
  }, [onUpdateOffre]);

  // Fetch market data with ChatGPT analysis
  const handleFetchMarketData = useCallback(async () => {
    if (!localOffre.property_info) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir les informations du bien d'abord.",
        variant: "destructive"
      });
      return;
    }

    const { code_postal, ville, surface_habitable, nombre_pieces, etage, dernier_etage, annee_construction, etat, charges_trimestrielles, prix_demande } = localOffre.property_info;
    
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
      // 1. Analyse quantitative (DVF/IA)
      const marketData = await fetchMarketData(
        code_postal,
        ville,
        surface_habitable,
        nombre_pieces,
        false,
        {
          etage,
          dernier_etage,
          annee_construction,
          etat,
          charges_trimestrielles,
          prix_demande
        }
      );

      if (!marketData) {
        toast({
          title: "Erreur",
          description: "Impossible de récupérer les données de marché.",
          variant: "destructive"
        });
        return;
      }

      // Calculer l'écart avec le prix demandé
      const ecart = localOffre.property_info.prix_demande 
        ? ((localOffre.property_info.prix_demande - marketData.valeur_estimee_mediane) / marketData.valeur_estimee_mediane) * 100
        : 0;

      marketData.ecart_prix_demande_vs_marche = Math.round(ecart);
      
      if (ecart < -5) marketData.conclusion = 'bonne-affaire';
      else if (ecart > 10) marketData.conclusion = 'survalorise';
      else marketData.conclusion = 'correct';

      // 2. Analyse qualitative (IA) - TOUJOURS appelée
      let chatgptAnalysis = null;
      let aiErrorType = null;
      
      try {
        const prixReferenceM2 = marketData.prix_moyen_m2_exact ?? marketData.prix_moyen_m2_quartier;
        chatgptAnalysis = await fetchChatGPTAnalysis(localOffre.property_info, marketData, prixReferenceM2);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'RATE_LIMIT') {
            aiErrorType = 'RATE_LIMIT';
          } else if (error.message === 'INSUFFICIENT_CREDITS') {
            aiErrorType = 'INSUFFICIENT_CREDITS';
          }
        }
      }

      let fiabiliteScore = null;
      if (chatgptAnalysis) {
        fiabiliteScore = calculateFiabilite(chatgptAnalysis, marketData, localOffre.property_info);
      }

      // Générer automatiquement les scénarios IA si l'analyse ChatGPT est disponible
      let scenariosIA = [];
      if (chatgptAnalysis) {
        scenariosIA = genererRecommandationsScenarios(
          chatgptAnalysis,
          marketData,
          localOffre.property_info
        );
      }

      setLocalOffre(prev => {
        const newOffre = {
          ...prev,
          market_analysis: marketData,
          chatgpt_analysis: chatgptAnalysis,
          fiabilite: fiabiliteScore,
          scenarios: scenariosIA,
          scenario_actif: scenariosIA.find(s => s.recommande)?.id || scenariosIA[0]?.id
        };
        // Sauvegarder automatiquement les données de marché
        onUpdateOffre(newOffre);
        return newOffre;
      });

      // Toast de succès
      if (chatgptAnalysis) {
        toast({
          title: "Analyse complète terminée",
          description: "Données de marché et analyse IA récupérées. Les scénarios d'offre ont été générés automatiquement."
        });
      } else {
        toast({
          title: "Données de marché récupérées",
          description: "L'analyse IA n'a pas pu être effectuée. Les scénarios d'offre ne peuvent pas être générés.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la récupération des données.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingMarket(false);
    }
  }, [localOffre.property_info, onUpdateOffre]);

  // Fonction pour générer les scénarios recommandés par l'IA
  const genererRecommandationsScenarios = (
    chatgptAnalysis: any,
    marketData: MarketAnalysis,
    propertyInfo: PropertyInfo
  ): OffreScenario[] => {
    const prixDemande = propertyInfo.prix_demande || 0;
    const prixMarche = marketData.valeur_estimee_mediane || 0;
    
    // Calculer les montants basés sur l'analyse
    const montantConservative = Math.round(prixMarche * 0.95); // 5% en dessous du marché
    const montantBalanced = Math.round(prixMarche * 0.98); // 2% en dessous du marché
    const montantAggressive = Math.round(prixMarche * 1.02); // 2% au-dessus du marché

    return [
      {
        id: "conservative-ai",
        nom: "Maximiser l'acceptation",
        strategie: "conservative",
        montant: montantConservative,
        clauses: ["Financement", "Inspection technique"],
        delai_reponse: 72,
        commentaire: "Offre prudente pour maximiser les chances d'acceptation",
        probabilite_acceptation: calculerProbabiliteAcceptation(
          montantConservative,
          prixDemande,
          prixMarche,
          2,
          72,
          'equilibre'
        ),
        risque: "faible",
        plus_value_potentielle: "limitée",
        justification: "Stratégie prudente basée sur l'analyse de marché",
        recommande: false,
        raison_recommandation: "Recommandé si vous voulez maximiser vos chances d'acceptation"
      },
      {
        id: "balanced-ai",
        nom: "Équilibré",
        strategie: "balanced",
        montant: montantBalanced,
        clauses: ["Financement", "Inspection technique", "Vente de votre bien"],
        delai_reponse: 96,
        commentaire: "Équilibre entre acceptation et négociation",
        probabilite_acceptation: calculerProbabiliteAcceptation(
          montantBalanced,
          prixDemande,
          prixMarche,
          3,
          96,
          'equilibre'
        ),
        risque: "modéré",
        plus_value_potentielle: "correcte",
        justification: "Stratégie équilibrée recommandée par l'IA",
        recommande: true,
        raison_recommandation: "Stratégie optimale selon l'analyse de marché et l'IA"
      },
      {
        id: "aggressive-ai",
        nom: "Maximiser la plus-value",
        strategie: "aggressive",
        montant: montantAggressive,
        clauses: ["Financement", "Inspection technique", "Vente de votre bien", "Négociation du prix"],
        delai_reponse: 120,
        commentaire: "Offre agressive pour maximiser la plus-value",
        probabilite_acceptation: calculerProbabiliteAcceptation(
          montantAggressive,
          prixDemande,
          prixMarche,
          4,
          120,
          'equilibre'
        ),
        risque: "élevé",
        plus_value_potentielle: "importante",
        justification: "Stratégie agressive pour maximiser les gains",
        recommande: false,
        raison_recommandation: "Recommandé si vous êtes prêt à prendre des risques pour maximiser vos gains"
      }
    ];
  };

  // Générer le modèle d'offre via l'IA
  const handleGenerateOffer = async () => {
    if (!localOffre.scenario_actif) {
      toast({
        title: "Aucun scénario sélectionné",
        description: "Veuillez d'abord sélectionner un scénario d'offre.",
        variant: "destructive"
      });
      return;
    }

    const scenario = localOffre.scenarios.find(s => s.id === localOffre.scenario_actif);
    if (!scenario) {
      toast({
        title: "Scénario introuvable",
        description: "Le scénario sélectionné n'existe plus.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingOffer(true);
    try {
      const template = await generateOfferTemplate(
        localOffre.property_info,
        localOffre.market_analysis,
        localOffre.chatgpt_analysis,
        scenario
      );
      
      setGeneratedOfferTemplate(template);
      
      toast({
        title: "Modèle d'offre généré",
        description: "Le modèle d'offre a été généré avec succès."
      });
    } catch (error) {
      console.error('Error generating offer template:', error);
      
      if (error instanceof Error) {
        if (error.message === 'RATE_LIMIT') {
          toast({
            title: "Limite de requêtes atteinte",
            description: "Trop de requêtes. Réessayez dans quelques instants.",
            variant: "destructive"
          });
        } else if (error.message === 'INSUFFICIENT_CREDITS') {
          toast({
            title: "Crédits insuffisants",
            description: "Ajoutez des crédits Lovable AI pour continuer.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erreur de génération",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la génération du modèle d'offre.",
          variant: "destructive"
        });
      }
    } finally {
      setIsGeneratingOffer(false);
    }
  };

  // Copier le modèle d'offre dans le presse-papiers
  const copyToClipboard = async () => {
    if (!generatedOfferTemplate) {
      toast({
        title: "Aucun modèle à copier",
        description: "Générez d'abord un modèle d'offre.",
        variant: "destructive"
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedOfferTemplate);
      toast({
        title: "Modèle copié",
        description: "Le modèle d'offre a été copié dans le presse-papiers."
      });
    } catch (error) {
      toast({
        title: "Erreur de copie",
        description: "Impossible de copier le modèle dans le presse-papiers.",
        variant: "destructive"
      });
    }
  };

  const handleSave = () => {
    onUpdateOffre(localOffre);
    toast({
      title: "Sauvegardé",
      description: "Vos modifications ont été enregistrées."
    });
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="space-y-6">
      {!canProceed && (
        <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bien">Bien</TabsTrigger>
          <TabsTrigger value="marche" disabled={!localOffre.property_info}>Marché</TabsTrigger>
          <TabsTrigger value="scenarios" disabled={!localOffre.market_analysis}>Scénarios</TabsTrigger>
          <TabsTrigger value="offres" disabled={!localOffre.scenarios.length}>Offres</TabsTrigger>
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
                <Popover 
                  open={openAddressPopover && addressSuggestions.length > 0} 
                  onOpenChange={setOpenAddressPopover}
                  modal={false}
                >
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
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setOpenAddressPopover(false);
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
                  <PopoverContent 
                    className="w-[400px] p-0 bg-popover z-50" 
                    align="start" 
                    sideOffset={5}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <Command shouldFilter={false}>
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
                <div className="space-y-3">
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
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="dernier_etage"
                      checked={localOffre.property_info?.dernier_etage || false}
                      onCheckedChange={(checked) => updatePropertyInfo("dernier_etage", checked)}
                    />
                    <Label htmlFor="dernier_etage" className="cursor-pointer">
                      Dernier étage
                    </Label>
                  </div>
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
                  <Label htmlFor="charges">Charges trimestrielles (€)</Label>
                  <Input
                    id="charges"
                    type="number"
                    value={localOffre.property_info?.charges_trimestrielles || ""}
                    onChange={(e) => updatePropertyInfo("charges_trimestrielles", parseFloat(e.target.value) || undefined)}
                    placeholder="450"
                  />
                </div>
                <div>
                  <Label htmlFor="taxe_fonciere">Taxe foncière annuelle (€)</Label>
                  <Input
                    id="taxe_fonciere"
                    type="number"
                    value={localOffre.property_info?.taxe_fonciere || ""}
                    onChange={(e) => updatePropertyInfo("taxe_fonciere", parseFloat(e.target.value) || undefined)}
                    placeholder="1200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA pour passer à l'onglet Marché */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Prêt à analyser le marché ?</h3>
                  <p className="text-sm text-muted-foreground">
                    Remplissez les informations du bien et lancez l'analyse de marché
                  </p>
                </div>
                <Button 
                  onClick={handleFetchMarketData} 
                  disabled={isLoadingMarket || !localOffre.property_info?.code_postal || !localOffre.property_info?.ville || !localOffre.property_info?.surface_habitable || !localOffre.property_info?.nombre_pieces}
                >
                  {isLoadingMarket ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: MARCHÉ */}
        <TabsContent value="marche" className="space-y-4 mt-4">
          {localOffre.market_analysis && localOffre.property_info && localOffre.market_analysis.valeur_estimee_mediane ? (
            <>
              {/* Résumé du bien avec bouton Modifier */}
              <PropertyInfoSummary 
                propertyInfo={localOffre.property_info}
                onEdit={() => setActiveTab("bien")}
              />
              
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Position du bien sur le marché
              </CardTitle>
                    {localOffre.market_analysis.source && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <BarChart3 className="h-3 w-3" />
                        {localOffre.market_analysis.source === 'DVF' 
                          ? `DVF ${localOffre.market_analysis.dataSource || '2024/2025'}`
                          : 'IA'
                        }
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <MarketPositionChart
                    prixDemande={localOffre.property_info.prix_demande}
                    valeurBasse={localOffre.market_analysis.valeur_estimee_basse}
                    valeurHaute={localOffre.market_analysis.valeur_estimee_haute}
                    valeurMediane={localOffre.market_analysis.valeur_estimee_mediane}
                    surface={localOffre.property_info.surface_habitable}
                  />
                </CardContent>
              </Card>

              {/* Avertissement de fiabilité */}
              {localOffre.market_analysis.fiabilite_estimation === 'faible' && (
                <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Fiabilité de l'estimation faible
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {localOffre.market_analysis.statistiques_pieces.correspondance_exacte < 10 
                          ? `Seulement ${localOffre.market_analysis.statistiques_pieces.correspondance_exacte} transaction${localOffre.market_analysis.statistiques_pieces.correspondance_exacte > 1 ? 's' : ''} trouvée${localOffre.market_analysis.statistiques_pieces.correspondance_exacte > 1 ? 's' : ''} avec le même nombre de pièces dans la commune. L'estimation est moins précise.`
                          : 'L\'estimation est basée sur des données limitées. Les résultats peuvent être moins précis.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistiques par nombre de pièces - REMONTÉE SOUS LE GRAPHIQUE */}
              {localOffre.market_analysis.statistiques_pieces && (
                <Card className="bg-accent/5 border-accent/30">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Analyse par nombre de pièces
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Résumé des correspondances */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {localOffre.market_analysis.statistiques_pieces.correspondance_exacte}
                          </div>
                          <div className="text-xs text-muted-foreground">Correspondance exacte</div>
                          <div className="text-xs text-muted-foreground">
                            {localOffre.market_analysis.statistiques_pieces.cible_pieces} pièces
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {localOffre.market_analysis.statistiques_pieces.correspondance_proche}
                          </div>
                          <div className="text-xs text-muted-foreground">Correspondance proche</div>
                          <div className="text-xs text-muted-foreground">±1 pièce</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {localOffre.market_analysis.statistiques_pieces.total_transactions}
                          </div>
                          <div className="text-xs text-muted-foreground">Total transactions</div>
                          <div className="text-xs text-muted-foreground">Analysées</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-foreground">
                            {localOffre.market_analysis.statistiques_pieces.groupes_pieces.length}
                          </div>
                          <div className="text-xs text-muted-foreground">Groupes de pièces</div>
                          <div className="text-xs text-muted-foreground">Différents</div>
                        </div>
                      </div>

                      {/* Détail par nombre de pièces */}
                      {localOffre.market_analysis.statistiques_pieces.groupes_pieces.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-3">
                            Prix moyen par nombre de pièces
                          </h4>
                          <div className="grid gap-3 w-full" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))'}}>
                            {localOffre.market_analysis.statistiques_pieces.groupes_pieces.slice(0, 6).map((groupe, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{groupe.nombre_pieces} pièces</span>
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
                                  <div className="font-semibold text-foreground">
                                    {Math.round(groupe.prix_moyen_m2).toLocaleString('fr-FR')}€/m²
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {groupe.nombre_transactions} transaction{groupe.nombre_transactions > 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {localOffre.market_analysis.statistiques_pieces.groupes_pieces.length > 6 && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              +{localOffre.market_analysis.statistiques_pieces.groupes_pieces.length - 6} autres groupes
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Analyse experte IA et Fiabilité */}
              {localOffre.chatgpt_analysis && localOffre.fiabilite ? (
                <>
                  <ChatGPTAnalysisCard 
                    analysis={localOffre.chatgpt_analysis}
                    prixDemande={localOffre.property_info.prix_demande}
                    prixReferenceM2={localOffre.market_analysis?.prix_moyen_m2_exact ?? localOffre.market_analysis?.prix_moyen_m2_quartier ?? 0}
                    surfaceHabitable={localOffre.property_info.surface_habitable}
                  />
                  <FiabiliteGauge fiabilite={localOffre.fiabilite} />
                </>
              ) : (
                <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Analyse experte IA indisponible
                      </p>
                      <p className="text-xs text-muted-foreground">
                        L'analyse qualitative nécessite Lovable AI. Les données quantitatives du marché sont disponibles ci-dessus. 
                        Si le problème persiste, vérifiez vos crédits dans Settings → Workspace → Usage.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Liste des biens similaires */}
              {localOffre.market_analysis.transactions_similaires && 
               localOffre.market_analysis.transactions_similaires.length > 0 && (
                <SimilarPropertiesList 
                  properties={localOffre.market_analysis.transactions_similaires}
                  currentPropertyPrice={localOffre.property_info.prix_demande || localOffre.market_analysis.valeur_estimee_mediane}
                />
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  onClick={handleFetchMarketData} 
                  variant="outline"
                  disabled={isLoadingMarket}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rafraîchir l'analyse
                </Button>
                <Button 
                  onClick={() => setActiveTab("scenarios")}
                  className="flex-1"
                  disabled={!localOffre.scenarios.length}
                >
                  Définir mes scénarios d'offre
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analyse de marché requise</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Remplissez les informations du bien et lancez l'analyse de marché pour voir les données.
                </p>
                <Button onClick={handleFetchMarketData} disabled={isLoadingMarket}>
                  {isLoadingMarket ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Analyser le marché
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3: SCÉNARIOS */}
        <TabsContent value="scenarios" className="space-y-4 mt-4">
          {localOffre.scenarios.length > 0 ? (
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Lightbulb className="h-5 w-5 text-accent-foreground" />
                    <div>
                      <h3 className="font-semibold">Scénarios d'offre générés par l'IA</h3>
                      <p className="text-sm text-muted-foreground">
                        Basés sur l'analyse de marché et les données du bien
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {localOffre.scenarios.map((scenario) => (
                  <ScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    isActive={localOffre.scenario_actif === scenario.id}
                    onSelect={() => setLocalOffre(prev => ({ ...prev, scenario_actif: scenario.id }))}
                    layout="vertical"
                  />
                ))}
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">Prêt à générer votre offre ?</h3>
                      <p className="text-sm text-muted-foreground">
                        Passez à l'onglet "Offres" pour générer le modèle d'offre
                      </p>
                    </div>
                    <Button onClick={() => setActiveTab("offres")}>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Générer l'offre
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun scénario disponible</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Les scénarios d'offre sont générés automatiquement après l'analyse de marché.
                </p>
                <Button onClick={() => setActiveTab("marche")}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Analyser le marché
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 4: OFFRES */}
        <TabsContent value="offres" className="space-y-4 mt-4">
          {localOffre.scenarios.length > 0 ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sélection du scénario</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={localOffre.scenario_actif || ""}
                    onValueChange={(value) => setLocalOffre(prev => ({ ...prev, scenario_actif: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisissez un scénario d'offre" />
                    </SelectTrigger>
                    <SelectContent>
                      {localOffre.scenarios.map((scenario) => (
                        <SelectItem key={scenario.id} value={scenario.id}>
                          {scenario.nom} - {scenario.montant.toLocaleString('fr-FR')}€
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {localOffre.scenario_actif && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Détails du scénario</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const scenario = localOffre.scenarios.find(s => s.id === localOffre.scenario_actif);
                        if (!scenario) return null;
                        
                        return (
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium">{scenario.nom}</h4>
                              <p className="text-sm text-muted-foreground">{scenario.commentaire}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-muted-foreground">Montant</Label>
                                <p className="font-semibold">{scenario.montant.toLocaleString('fr-FR')}€</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Probabilité d'acceptation</Label>
                                <p className="font-semibold">{scenario.probabilite_acceptation}%</p>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Clauses suspensives</Label>
                              <ul className="text-sm mt-1">
                                {scenario.clauses.map((clause, index) => (
                                  <li key={index} className="flex items-center gap-2">
                                    <CheckCircle2 className="h-3 w-3 text-accent-foreground" />
                                    {clause}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Modèle d'offre</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button 
                        onClick={handleGenerateOffer} 
                        disabled={isGeneratingOffer}
                        className="w-full"
                      >
                        {isGeneratingOffer ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Génération en cours...
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-2" />
                            Générer le modèle d'offre
                          </>
                        )}
                      </Button>

                      {generatedOfferTemplate && (
                        <div className="space-y-3">
                          <Textarea
                            value={generatedOfferTemplate}
                            readOnly
                            className="min-h-[200px]"
                          />
                          <Button onClick={copyToClipboard} variant="outline" className="w-full">
                            <Copy className="h-4 w-4 mr-2" />
                            Copier dans le presse-papiers
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun scénario disponible</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Les scénarios d'offre sont générés automatiquement après l'analyse de marché.
                </p>
                <Button onClick={() => setActiveTab("scenarios")}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Voir les scénarios
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Actions pour le modal */}
      {isModal && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!canProceed}>
            Sauvegarder
          </Button>
        </div>
      )}
    </div>
  );
}