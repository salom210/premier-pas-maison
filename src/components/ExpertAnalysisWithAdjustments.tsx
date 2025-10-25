import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Lightbulb, Cpu, Calculator } from "lucide-react";
import type { ChatGPTAnalysis, PropertyInfo, MarketAnalysis, PriceAdjustment } from "@/types/project";
import { calculateTotalImpact, calculateAdjustedPrice } from "@/lib/adjustmentsService";

interface ExpertAnalysisWithAdjustmentsProps {
  analysis: ChatGPTAnalysis;
  propertyInfo: PropertyInfo;
  marketAnalysis: MarketAnalysis;
  adjustments: PriceAdjustment[];
  onAdjustmentToggle: (adjustmentId: string, isApplied: boolean) => void;
}

export function ExpertAnalysisWithAdjustments({
  analysis,
  propertyInfo,
  marketAnalysis,
  adjustments,
  onAdjustmentToggle
}: ExpertAnalysisWithAdjustmentsProps) {
  const [totalImpact, setTotalImpact] = useState(0);
  const [adjustedPriceM2, setAdjustedPriceM2] = useState<number | null>(null);
  const [adjustedValue, setAdjustedValue] = useState<number | null>(null);

  useEffect(() => {
    const impact = calculateTotalImpact(adjustments);
    setTotalImpact(impact);
    
    const prixReferenceM2 = marketAnalysis.prix_moyen_m2_exact ?? marketAnalysis.prix_moyen_m2_quartier;
    setAdjustedPriceM2(calculateAdjustedPrice(prixReferenceM2, adjustments));
    setAdjustedValue(calculateAdjustedPrice(marketAnalysis.valeur_estimee_mediane, adjustments));
  }, [adjustments, marketAnalysis]);

  // Calculer le prix juste basé sur le prix de référence/m² et la surface
  const prixJusteCalcule = Math.round((marketAnalysis.prix_moyen_m2_exact ?? marketAnalysis.prix_moyen_m2_quartier) * propertyInfo.surface_habitable);
  
  // Calculer l'écart basé sur le prix juste calculé
  const ecartCalcule = Math.round(((propertyInfo.prix_demande - prixJusteCalcule) / prixJusteCalcule) * 100);
  
  // Calculer l'écart avec les prix ajustés
  const ecartAjuste = adjustedValue ? Math.round(((propertyInfo.prix_demande - adjustedValue) / adjustedValue) * 100) : ecartCalcule;

  // Déterminer la conclusion basée sur l'écart prix/marché
  const getDynamicConclusion = () => {
    if (ecartAjuste < -5) return 'sous-cote';
    if (ecartAjuste > 5) return 'sur-cote';
    return 'correct';
  };

  const getConclusionVariant = () => {
    const conclusion = getDynamicConclusion();
    switch (conclusion) {
      case 'sous-cote': return "default";
      case 'sur-cote': return "destructive";
      default: return "secondary";
    }
  };

  const getConclusionClassName = () => {
    const conclusion = getDynamicConclusion();
    switch (conclusion) {
      case 'sous-cote': return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
      case 'sur-cote': return "bg-red-100 text-red-800 border-red-200 hover:bg-red-200";
      default: return "";
    }
  };

  const getConclusionLabel = () => {
    const conclusion = getDynamicConclusion();
    switch (conclusion) {
      case 'sous-cote': return '🟢 Sous-coté';
      case 'sur-cote': return '🔴 Sur-coté';
      default: return '🟠 Prix correct';
    }
  };

  const formatEuros = (value: number) => {
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  };

  const prixReferenceM2 = marketAnalysis.prix_moyen_m2_exact ?? marketAnalysis.prix_moyen_m2_quartier;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Analyse experte
          </CardTitle>
          <div className="flex flex-col items-end gap-2">
            {getDynamicConclusion() !== 'correct' && (
              <Badge variant={getConclusionVariant()} className={getConclusionClassName()}>
                {getConclusionLabel()}
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1 text-xs">
              <Cpu className="h-3 w-3" />
              Gemini 2.5 Flash
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs">
          Analyse qualitative basée sur les données du marché immobilier français
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Section 1 - Indicateurs clés et estimation ajustée */}
        <Card className="bg-accent/5 border-accent/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Colonne 1: Écart prix demandé / marché */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {ecartAjuste < 0 ? (
                    <TrendingDown className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-xs text-muted-foreground">Écart prix / marché</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  <span className={ecartAjuste < 0 ? 'text-success' : 'text-destructive'}>
                    {ecartAjuste > 0 ? '+' : ''}{ecartAjuste}%
                  </span>
                </div>
                {totalImpact !== 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {ecartCalcule > 0 ? '+' : ''}{ecartCalcule}% avant ajustements
                  </div>
                )}
              </div>

              {/* Colonne 2: Prix/m² */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">Prix/m²</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  <span className="text-foreground">
                    {adjustedPriceM2 ? Math.round(adjustedPriceM2).toLocaleString('fr-FR') : Math.round(prixReferenceM2).toLocaleString('fr-FR')}€/m²
                  </span>
                </div>
                {adjustedPriceM2 && totalImpact !== 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.round(prixReferenceM2).toLocaleString('fr-FR')}€/m² avant ajustements
                  </div>
                )}
              </div>

              {/* Colonne 3: Valeur estimée */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">Valeur estimée</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  <span className="text-foreground">
                    {adjustedValue ? formatEuros(adjustedValue) : formatEuros(marketAnalysis.valeur_estimee_mediane)}
                  </span>
                </div>
                {adjustedValue && totalImpact !== 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatEuros(marketAnalysis.valeur_estimee_mediane)} avant ajustements
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2 - Décôtes et surcôtes */}
        {adjustments.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <Label className="text-sm font-medium">Décôtes et surcôtes appliquées</Label>
              </div>
              {totalImpact !== 0 && (
                <Badge 
                  variant={totalImpact >= 0 ? 'default' : 'destructive'}
                  className={`text-xs ${
                    totalImpact > 0 
                      ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' 
                      : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                  }`}
                >
                  {totalImpact > 0 ? '+' : ''}{totalImpact.toFixed(1)}%
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {adjustments.map((adjustment) => (
                <div key={adjustment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg min-h-[60px]">
                  <div className="flex items-center gap-3 flex-1">
                    {adjustment.type === 'bonus' ? (
                      <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Label className="text-sm font-medium">{adjustment.label}</Label>
                      <Badge 
                        variant={adjustment.type === 'bonus' ? 'default' : 'destructive'}
                        className={`text-xs flex-shrink-0 ${
                          adjustment.type === 'bonus' 
                            ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                        }`}
                      >
                        {adjustment.impact_pct > 0 ? '+' : ''}{adjustment.impact_pct}%
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={adjustment.isApplied}
                    onCheckedChange={(checked) => onAdjustmentToggle(adjustment.id, checked)}
                    className="flex-shrink-0"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3 - Analyse qualitative */}
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-foreground leading-relaxed">{analysis.analyse_qualitative}</p>
        </div>

        {/* Section 4 - Points forts / faibles */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Points forts
            </h4>
            <ul className="space-y-1.5">
              {analysis.points_forts.map((point, i) => (
                <li key={i} className="text-xs text-foreground flex items-start gap-2">
                  <span className="text-success mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Points d'attention
            </h4>
            <ul className="space-y-1.5">
              {analysis.points_faibles.map((point, i) => (
                <li key={i} className="text-xs text-foreground flex items-start gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Section 5 - Recommandation */}
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle className="text-sm">Recommandation</AlertTitle>
          <AlertDescription className="text-xs">{analysis.recommandation}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

