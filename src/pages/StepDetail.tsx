import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ArrowLeft, AlertTriangle } from "lucide-react";
import { mockProjectData } from "@/data/mockData";
import { MissingInfoModal } from "@/components/modals/MissingInfoModal";
import type { ChecklistItem } from "@/types/project";

const StepDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState(mockProjectData);
  const [showMissingModal, setShowMissingModal] = useState(false);

  const step = projectData.steps.find((s) => s.id === id);

  if (!step) {
    return (
      <div className="max-w-4xl">
        <p>Étape introuvable</p>
        <Button onClick={() => navigate("/")} className="mt-4">
          Retour au parcours
        </Button>
      </div>
    );
  }

  const allCriticalDone = step.checklist
    .filter((item) => item.critical)
    .every((item) => item.status === "done");

  const noMissingInfo = step.missing_info.every((m) => m.status === "present");
  const canComplete = allCriticalDone && noMissingInfo && step.blockers.length === 0;

  const handleToggleItem = (itemId: string) => {
    setProjectData((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === step.id
          ? {
              ...s,
              checklist: s.checklist.map((item) =>
                item.id === itemId
                  ? { ...item, status: item.status === "done" ? "todo" : "done" }
                  : item
              ),
            }
          : s
      ),
    }));
  };

  const handleMarkReceived = (missingId: string) => {
    setProjectData((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === step.id
          ? {
              ...s,
              missing_info: s.missing_info.map((m) =>
                m.id === missingId ? { ...m, status: "present" as const } : m
              ),
              blockers: s.blockers.filter((b) => b.id !== "blk_r_ag"),
            }
          : s
      ),
    }));
  };

  return (
    <div className="max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour au parcours
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">{step.label}</h1>
        <div className="flex items-center gap-2">
          <Badge variant={step.status === "done" ? "default" : "secondary"}>
            {step.status === "done" ? "Terminé" : step.status === "in_progress" ? "En cours" : "À faire"}
          </Badge>
          {step.missing_info.some((m) => m.status === "absent") && (
            <Badge variant="outline" className="bg-warning/10 border-warning/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Informations manquantes
            </Badge>
          )}
        </div>
      </div>

      {/* Checklist */}
      <Card className="shadow-card mb-6">
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {step.checklist.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/50"
            >
              <button
                onClick={() => handleToggleItem(item.id)}
                className="shrink-0 mt-0.5"
              >
                {item.status === "done" ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-sm ${
                      item.status === "done"
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.critical && item.status === "todo" && (
                    <Badge variant="outline" className="text-xs bg-warning/10 border-warning/30">
                      Critique
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {step.missing_info.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setShowMissingModal(true)}
            className="flex-1"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Informations manquantes ({step.missing_info.filter((m) => m.status === "absent").length})
          </Button>
        )}
        <Button disabled={!canComplete} className="flex-1">
          Marquer l'étape comme terminée
        </Button>
      </div>

      {!canComplete && (
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {!allCriticalDone && "Complétez tous les éléments critiques. "}
          {!noMissingInfo && "Sécurisez toutes les informations manquantes. "}
          {step.blockers.length > 0 && "Résolvez les éléments bloquants."}
        </p>
      )}

      <MissingInfoModal
        open={showMissingModal}
        onClose={() => setShowMissingModal(false)}
        missingItems={step.missing_info}
        catalogs={projectData.catalogs}
        onMarkReceived={handleMarkReceived}
      />
    </div>
  );
};

export default StepDetail;
