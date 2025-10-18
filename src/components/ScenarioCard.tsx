import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, AlertCircle } from "lucide-react";
import type { OffreScenario } from "@/types/project";

interface ScenarioCardProps {
  scenario: OffreScenario;
  isActive: boolean;
  onSelect: () => void;
}

export function ScenarioCard({ scenario, isActive, onSelect }: ScenarioCardProps) {
  const getRisqueColor = (risque: string) => {
    switch (risque) {
      case 'faible': return 'bg-success/10 text-success-foreground border-success/30';
      case 'modéré': return 'bg-warning/10 text-warning-foreground border-warning/30';
      case 'élevé': return 'bg-destructive/10 text-destructive-foreground border-destructive/30';
      default: return 'bg-muted';
    }
  };

  const getStrategieIcon = (strategie: string) => {
    switch (strategie) {
      case 'conservative': return <Target className="h-4 w-4" />;
      case 'balanced': return <TrendingUp className="h-4 w-4" />;
      case 'aggressive': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getProgressColor = (proba: number) => {
    if (proba >= 70) return '[&>div]:bg-success';
    if (proba >= 50) return '[&>div]:bg-warning';
    return '[&>div]:bg-destructive';
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isActive ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getStrategieIcon(scenario.strategie)}
            {scenario.nom}
          </CardTitle>
          {isActive && <Badge variant="default">Actif</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Montant proposé</p>
          <p className="text-2xl font-bold text-foreground">
            {scenario.montant ? `${scenario.montant.toLocaleString('fr-FR')} €` : 'Non défini'}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Probabilité d'acceptation</p>
            <p className="text-sm font-semibold text-foreground">
              {scenario.probabilite_acceptation}%
            </p>
          </div>
          <Progress 
            value={scenario.probabilite_acceptation} 
            className={`h-2 ${getProgressColor(scenario.probabilite_acceptation)}`}
          />
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getRisqueColor(scenario.risque)}>
            Risque {scenario.risque}
          </Badge>
          <Badge variant="outline" className="bg-accent/10">
            {scenario.plus_value_potentielle}
          </Badge>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Stratégie</p>
          <p className="text-sm text-foreground">{scenario.justification}</p>
        </div>

        {scenario.clauses.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {scenario.clauses.length} clause(s) suspensive(s)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
