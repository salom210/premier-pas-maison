import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { mockProjectData } from "@/data/mockData";
import { StepChecklist } from "@/components/StepChecklist";
import { MissingInfoList } from "@/components/MissingInfoList";
import { BlockersList } from "@/components/BlockersList";
import type { Step } from "@/types/project";

const Timeline = () => {
  const [projectData] = useState(mockProjectData);
  const currentStep = projectData.steps.find((s) => s.status === "in_progress");
  
  const hasBlockers = currentStep && (
    currentStep.blockers.length > 0 ||
    currentStep.missing_info.length > 0 ||
    currentStep.checklist.some((c) => c.critical && c.status === "todo")
  );

  const getNonRetourForStep = (stepId: string) => {
    return projectData.rules.non_retours.find((nr) => nr.step === stepId);
  };

  const getStatusIcon = (step: Step) => {
    if (step.status === "done") return CheckCircle2;
    if (step.status === "in_progress") return Circle;
    return Circle;
  };

  const getStatusColor = (step: Step) => {
    if (step.status === "done") return "text-primary";
    if (step.status === "in_progress") return "text-primary";
    return "text-muted-foreground";
  };

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
                <CardDescription className="mt-1">{currentStep.label}</CardDescription>
              </div>
              {hasBlockers && (
                <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  À sécuriser
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Blockers */}
            <BlockersList blockers={currentStep.blockers} />

            {/* Missing Info */}
            <MissingInfoList 
              items={currentStep.missing_info} 
              catalogs={projectData.catalogs}
            />

            {/* Checklist */}
            <StepChecklist items={currentStep.checklist} />

            {/* Next action */}
            <div className="pt-4 border-t border-border">
              {currentStep.next_allowed ? (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Cette étape est prête. Vous pouvez continuer.
                  </p>
                  <Button className="w-full sm:w-auto">
                    Passer à l'étape suivante
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Pour avancer sereinement, veuillez compléter les éléments ci-dessus.
                  </p>
                  <Button disabled className="w-full sm:w-auto">
                    Étape suivante indisponible
                  </Button>
                </div>
              )}
            </div>
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
            {projectData.steps.map((step, idx) => {
              const isLast = idx === projectData.steps.length - 1;
              const StatusIcon = getStatusIcon(step);
              const statusColor = getStatusColor(step);
              const nonRetour = getNonRetourForStep(step.id);

              return (
                <div key={step.id} className="relative">
                  <div className="flex items-start gap-4">
                    <div className="relative flex flex-col items-center">
                      <StatusIcon className={`h-6 w-6 shrink-0 ${statusColor}`} />
                      {!isLast && (
                        <div
                          className={`w-0.5 h-12 mt-2 ${
                            step.status === "done" ? "bg-primary/30" : "bg-border"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-medium ${
                            step.status === "in_progress" ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </h3>
                        {nonRetour && (
                          <Badge variant="outline" className="text-xs">
                            ⛔ Point de non‑retour
                          </Badge>
                        )}
                      </div>
                      {step.status === "in_progress" && (
                        <p className="text-sm text-muted-foreground">
                          {step.checklist.filter((c) => c.status === "todo").length} élément
                          {step.checklist.filter((c) => c.status === "todo").length > 1 ? "s" : ""} en attente
                        </p>
                      )}
                      {step.status === "done" && (
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
