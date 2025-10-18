import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, AlertTriangle, FileText, ListChecks } from "lucide-react";
import { mockProjectData } from "@/data/mockData";
import { MissingInfoModal } from "@/components/modals/MissingInfoModal";
import { NonRetourModal } from "@/components/modals/NonRetourModal";
import type { Step } from "@/types/project";

const Timeline = () => {
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState(mockProjectData);
  const [selectedMissingStep, setSelectedMissingStep] = useState<string | null>(null);
  const [selectedNonRetour, setSelectedNonRetour] = useState<string | null>(null);

  const currentStep = projectData.steps.find((s) => s.status === "in_progress");
  
  const hasBlockers = currentStep && (
    currentStep.blockers.length > 0 ||
    currentStep.missing_info.some((m) => m.status === "absent") ||
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

  const handleMarkReceived = (missingId: string) => {
    if (!selectedMissingStep) return;
    
    setProjectData((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === selectedMissingStep
          ? {
              ...s,
              missing_info: s.missing_info.map((m) =>
                m.id === missingId ? { ...m, status: "present" as const } : m
              ),
              blockers: s.blockers.filter((b) => b.id !== "blk_r_ag"),
              next_allowed: s.missing_info.every((m) => m.id === missingId || m.status === "present"),
            }
          : s
      ),
    }));
  };

  const selectedStepMissing = selectedMissingStep
    ? projectData.steps.find((s) => s.id === selectedMissingStep)
    : null;

  const selectedNonRetourObj = selectedNonRetour
    ? projectData.rules.non_retours.find((nr) => nr.step === selectedNonRetour)
    : null;

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

      {/* Current step summary */}
      {currentStep && (
        <Card className="mb-8 border-primary/20 shadow-card">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">Étape en cours</CardTitle>
                <p className="text-muted-foreground mt-1">{currentStep.label}</p>
              </div>
              {hasBlockers && (
                <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  À sécuriser
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/step/${currentStep.id}`)}
                className="justify-start"
              >
                <ListChecks className="h-4 w-4 mr-2" />
                Checklist ({currentStep.checklist.filter((c) => c.status === "todo").length} en attente)
              </Button>
              {currentStep.missing_info.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setSelectedMissingStep(currentStep.id)}
                  className="justify-start"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Infos manquantes ({currentStep.missing_info.filter((m) => m.status === "absent").length})
                </Button>
              )}
            </div>
            <div className="pt-4 border-t border-border">
              <Button disabled={!currentStep.next_allowed} className="w-full">
                Passer à l'étape suivante
              </Button>
              {!currentStep.next_allowed && (
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Complétez les éléments requis pour débloquer cette action.
                </p>
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
                      <div className="flex items-center gap-2 mb-2">
                        <h3
                          className={`font-medium ${
                            step.status === "in_progress" ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {step.label}
                        </h3>
                        {step.blockers.length > 0 && (
                          <Badge variant="outline" className="text-xs bg-warning/10 border-warning/30">
                            ⚠ {step.blockers.length}
                          </Badge>
                        )}
                        {nonRetour && (
                          <button
                            onClick={() => setSelectedNonRetour(step.id)}
                            className="inline-flex"
                          >
                            <Badge variant="outline" className="text-xs hover:bg-accent cursor-pointer">
                              ⛔ Point de non‑retour
                            </Badge>
                          </button>
                        )}
                      </div>
                      {step.status === "in_progress" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/step/${step.id}`)}
                          >
                            <ListChecks className="h-3 w-3 mr-1" />
                            Checklist
                          </Button>
                          {step.missing_info.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedMissingStep(step.id)}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Infos manquantes
                            </Button>
                          )}
                        </div>
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

      {/* Modals */}
      {selectedStepMissing && (
        <MissingInfoModal
          open={!!selectedMissingStep}
          onClose={() => setSelectedMissingStep(null)}
          missingItems={selectedStepMissing.missing_info}
          catalogs={projectData.catalogs}
          onMarkReceived={handleMarkReceived}
        />
      )}
      {selectedNonRetourObj && (
        <NonRetourModal
          open={!!selectedNonRetour}
          onClose={() => setSelectedNonRetour(null)}
          nonRetour={selectedNonRetourObj}
        />
      )}
    </div>
  );
};

export default Timeline;
