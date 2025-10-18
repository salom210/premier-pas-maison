import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, AlertTriangle, XCircle } from "lucide-react";

interface Step {
  id: string;
  title: string;
  status: "completed" | "current" | "upcoming" | "blocked";
  pointOfNoReturn?: boolean;
  missingItems?: string[];
}

const mockSteps: Step[] = [
  {
    id: "1",
    title: "Définir votre projet",
    status: "completed",
  },
  {
    id: "2",
    title: "Obtenir un accord de principe bancaire",
    status: "current",
    missingItems: ["Justificatifs de revenus (3 derniers mois)", "Avis d'imposition N-1"],
  },
  {
    id: "3",
    title: "Rechercher votre bien",
    status: "upcoming",
  },
  {
    id: "4",
    title: "Faire une offre d'achat",
    status: "upcoming",
    pointOfNoReturn: true,
  },
];

const Timeline = () => {
  const currentStep = mockSteps.find((s) => s.status === "current");
  const hasBlockers = currentStep?.missingItems && currentStep.missingItems.length > 0;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Votre parcours d'acquisition
        </h1>
        <p className="text-muted-foreground">
          Suivez l'avancement de votre projet étape par étape
        </p>
      </div>

      {/* Current step highlight */}
      {currentStep && (
        <Card className="mb-8 border-primary/20 shadow-card">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">Étape en cours</CardTitle>
                <CardDescription className="mt-1">{currentStep.title}</CardDescription>
              </div>
              {hasBlockers && (
                <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  À sécuriser
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {currentStep.missingItems && currentStep.missingItems.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Pour avancer sereinement, il reste {currentStep.missingItems.length} élément
                  {currentStep.missingItems.length > 1 ? "s" : ""} à vérifier.
                </p>
                <ul className="space-y-2">
                  {currentStep.missingItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-4 w-full sm:w-auto">
                  Ajouter ces documents
                </Button>
              </div>
            )}
            {!hasBlockers && (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Cette étape est prête. Vous pouvez continuer.
                </p>
                <Button className="w-full sm:w-auto">
                  Passer à l'étape suivante
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Toutes les étapes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {mockSteps.map((step, idx) => {
              const isLast = idx === mockSteps.length - 1;
              const StatusIcon =
                step.status === "completed"
                  ? CheckCircle2
                  : step.status === "blocked"
                  ? XCircle
                  : Circle;

              return (
                <div key={step.id} className="relative">
                  <div className="flex items-start gap-4">
                    <div className="relative flex flex-col items-center">
                      <StatusIcon
                        className={`h-6 w-6 shrink-0 ${
                          step.status === "completed"
                            ? "text-primary"
                            : step.status === "current"
                            ? "text-primary"
                            : step.status === "blocked"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      />
                      {!isLast && (
                        <div
                          className={`w-0.5 h-12 mt-2 ${
                            step.status === "completed" ? "bg-primary/30" : "bg-border"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-medium ${
                            step.status === "current" ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.title}
                        </h3>
                        {step.pointOfNoReturn && (
                          <Badge variant="outline" className="text-xs">
                            ⛔ Point de non‑retour
                          </Badge>
                        )}
                      </div>
                      {step.status === "current" && step.missingItems && (
                        <p className="text-sm text-muted-foreground">
                          {step.missingItems.length} élément{step.missingItems.length > 1 ? "s" : ""} requis
                        </p>
                      )}
                      {step.status === "completed" && (
                        <p className="text-sm text-muted-foreground">Terminé</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Timeline;
