import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, TrendingUp, AlertCircle } from "lucide-react";
import type { OffreScenario } from "@/types/project";

interface ScenarioCardProps {
  scenario: OffreScenario;
  isActive: boolean;
  onSelect: () => void;
  layout?: 'horizontal' | 'vertical';
}

export function ScenarioCard({ scenario, isActive, onSelect, layout = 'vertical' }: ScenarioCardProps) {
  const getRisqueColor = (risque: string) => {
    switch (risque) {
      case 'faible': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case 'modéré': return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
      case 'élevé': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
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
    if (proba >= 70) return '[&>div]:bg-[hsl(140,65%,75%)]';
    if (proba >= 50) return '[&>div]:bg-orange-500';
    return '[&>div]:bg-red-500';
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md m-1 ${
        isActive ? 'ring-2 ring-primary shadow-lg' : ''
      } ${layout === 'horizontal' ? 'min-w-[350px] snap-center' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`Scénario ${scenario.nom}, montant ${scenario.montant?.toLocaleString('fr-FR')}€, probabilité d'acceptation ${scenario.probabilite_acceptation}%`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {getStrategieIcon(scenario.strategie)}
            {scenario.nom}
          </CardTitle>
          <div className="flex gap-2">
            {isActive && <Badge variant="default">Actif</Badge>}
            {scenario.recommande && !isActive && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30">
                Recommandé
              </Badge>
            )}
          </div>
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
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Stratégie</p>
          <p className="text-sm text-foreground">{scenario.justification}</p>
          {scenario.recommande && scenario.raison_recommandation && (
            <p className="text-xs text-primary mt-2 italic">
              💡 {scenario.raison_recommandation}
            </p>
          )}
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
