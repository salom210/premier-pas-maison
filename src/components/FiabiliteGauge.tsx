import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gauge, Calendar, CheckSquare, TrendingUp, BarChart, AlertTriangle } from "lucide-react";
import { FiabiliteCritere } from "./FiabiliteCritere";
import type { FiabiliteAnalysis } from "@/types/project";

interface FiabiliteGaugeProps {
  fiabilite: FiabiliteAnalysis;
}

export function FiabiliteGauge({ fiabilite }: FiabiliteGaugeProps) {
  const getFiabiliteVariant = (score: number) => {
    if (score >= 75) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  const getFiabiliteColor = (score: number) => {
    if (score >= 75) return "text-success";
    if (score >= 50) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card className="bg-gradient-to-br from-accent/5 to-background border-accent/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Fiabilité de l'analyse
          </CardTitle>
          <Badge variant={getFiabiliteVariant(fiabilite.score)} className="text-xs">
            {fiabilite.score}/100 - {fiabilite.niveau}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar principale */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Score global</span>
            <span className={`text-lg font-bold ${getFiabiliteColor(fiabilite.score)}`}>
              {fiabilite.score}%
            </span>
          </div>
          <Progress value={fiabilite.score} className="h-3" />
        </div>

        {/* Détail des critères */}
        <div className="space-y-2 pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Détail par critère
          </p>
          <FiabiliteCritere
            icon={Calendar}
            label="Fraîcheur des données"
            score={fiabilite.criteres.anciennete_donnees.score}
            detail={fiabilite.criteres.anciennete_donnees.detail}
            warning={fiabilite.criteres.anciennete_donnees.warning}
          />
          <FiabiliteCritere
            icon={CheckSquare}
            label="Complétude du bien"
            score={fiabilite.criteres.completude_bien.score}
            detail={fiabilite.criteres.completude_bien.detail}
            warning={fiabilite.criteres.completude_bien.warning}
          />
          <FiabiliteCritere
            icon={TrendingUp}
            label="Confiance IA"
            score={fiabilite.criteres.confiance_ia.score}
            detail={fiabilite.criteres.confiance_ia.detail}
            warning={fiabilite.criteres.confiance_ia.warning}
          />
          <FiabiliteCritere
            icon={BarChart}
            label="Transactions comparables"
            score={fiabilite.criteres.transactions_comparables.score}
            detail={fiabilite.criteres.transactions_comparables.detail}
            warning={fiabilite.criteres.transactions_comparables.warning}
          />
        </div>

        {/* Recommandations si fiabilité faible */}
        {fiabilite.recommandations.length > 0 && (
          <Alert variant={fiabilite.score < 60 ? "destructive" : "default"} className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <ul className="list-disc list-inside space-y-1 mt-1">
                {fiabilite.recommandations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
