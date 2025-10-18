import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Sparkles, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Lightbulb, Cpu } from "lucide-react";
import type { ChatGPTAnalysis } from "@/types/project";

interface ChatGPTAnalysisCardProps {
  analysis: ChatGPTAnalysis;
  prixDemande: number;
}

export function ChatGPTAnalysisCard({ analysis, prixDemande }: ChatGPTAnalysisCardProps) {
  const getConclusionVariant = (conclusion: string) => {
    switch (conclusion) {
      case 'sous-cote': return "default";
      case 'sur-cote': return "destructive";
      default: return "secondary";
    }
  };

  const getConclusionLabel = (conclusion: string) => {
    switch (conclusion) {
      case 'sous-cote': return '🟢 Sous-coté';
      case 'sur-cote': return '🔴 Sur-coté';
      default: return '🟠 Prix correct';
    }
  };

  const formatEuros = (value: number) => {
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  };

  const economiesPotentielles = analysis.marge_negociation > 0 
    ? Math.round(prixDemande * analysis.marge_negociation / 100)
    : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Analyse experte
          </CardTitle>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={getConclusionVariant(analysis.conclusion)}>
              {getConclusionLabel(analysis.conclusion)}
            </Badge>
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
        {/* Indicateurs clés */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-accent/10 rounded-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {analysis.ecart_estime < 0 ? (
                <TrendingDown className="h-4 w-4 text-success" />
              ) : (
                <TrendingUp className="h-4 w-4 text-destructive" />
              )}
              <span className="text-xs text-muted-foreground">Écart prix / marché</span>
            </div>
            <p className={`text-2xl font-bold ${analysis.ecart_estime < 0 ? 'text-success' : 'text-destructive'}`}>
              {analysis.ecart_estime > 0 ? '+' : ''}{analysis.ecart_estime}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Prix juste estimé</p>
            <p className="text-xl font-semibold text-foreground">{formatEuros(analysis.prix_juste_estime)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {Math.round(analysis.prix_juste_estime / (prixDemande / 100) - 100)}% vs demandé
            </p>
          </div>
        </div>

        {/* Analyse textuelle */}
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-foreground leading-relaxed">{analysis.analyse_qualitative}</p>
        </div>

        {/* Points forts / faibles */}
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

        {/* Recommandation */}
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle className="text-sm">Recommandation</AlertTitle>
          <AlertDescription className="text-xs">{analysis.recommandation}</AlertDescription>
        </Alert>

        {/* Marge de négociation */}
        {analysis.marge_negociation > 0 && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-foreground">Marge de négociation suggérée</span>
              <Badge variant="outline" className="text-primary">
                {analysis.marge_negociation}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Soit environ <span className="font-semibold text-foreground">{formatEuros(economiesPotentielles)}</span> de réduction potentielle
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
          <div className="flex items-center gap-2">
            <span>Confiance:</span>
            <Badge 
              variant={analysis.confiance === 'élevée' ? 'default' : analysis.confiance === 'moyenne' ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {analysis.confiance}
            </Badge>
          </div>
          <span className="text-right max-w-xs truncate" title={analysis.sources_comparaison}>
            {analysis.sources_comparaison}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Données du marché: {analysis.date_donnees_marche} ({analysis.fraicheur_donnees})
        </p>
      </CardContent>
    </Card>
  );
}
