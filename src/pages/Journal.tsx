import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { mockProjectData } from "@/data/mockData";
import type { Decision } from "@/types/project";

const Journal = () => {
  const [showForm, setShowForm] = useState(false);
  const [decisions, setDecisions] = useState<Decision[]>([
    {
      id: "1",
      date: "2025-01-15",
      label: "Budget maximal fixé à 350 000 €",
      rationale: "Basé sur ma capacité d'emprunt et mon apport personnel de 50 000 €",
    },
    {
      id: "2",
      date: "2025-01-18",
      label: "Zone de recherche : quartiers Nord et Est",
      rationale: "Proximité avec mon lieu de travail et disponibilité de crèches",
    },
  ]);

  const [formData, setFormData] = useState({
    label: "",
    rationale: "",
    step: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newDecision: Decision = {
      id: Date.now().toString(),
      date: new Date().toISOString().split("T")[0],
      label: formData.label,
      rationale: formData.rationale || undefined,
    };
    setDecisions([newDecision, ...decisions]);
    setFormData({ label: "", rationale: "", step: "" });
    setShowForm(false);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Journal de décisions
          </h1>
          <p className="text-muted-foreground">
            Historique de vos choix importants tout au long du parcours
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle décision
        </Button>
      </div>

      {showForm && (
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle>Enregistrer une décision</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="label">Décision</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Ex: Refus de l'offre pour le bien rue Victor Hugo"
                  required
                />
              </div>
              <div>
                <Label htmlFor="rationale">Pourquoi cette décision</Label>
                <Textarea
                  id="rationale"
                  value={formData.rationale}
                  onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
                  placeholder="Expliquez les raisons de cette décision..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="step">Étape concernée</Label>
                <Select value={formData.step} onValueChange={(v) => setFormData({ ...formData, step: v })}>
                  <SelectTrigger id="step">
                    <SelectValue placeholder="Sélectionner une étape" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockProjectData.steps.map((step) => (
                      <SelectItem key={step.id} value={step.id}>
                        {step.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  Enregistrer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {decisions.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Vos décisions seront enregistrées ici au fur et à mesure de votre avancement.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {decisions.map((entry) => (
            <Card key={entry.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{entry.label}</CardTitle>
                  </div>
                  <time className="text-sm text-muted-foreground shrink-0">
                    {new Date(entry.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </time>
                </div>
              </CardHeader>
              {entry.rationale && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{entry.rationale}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Journal;
