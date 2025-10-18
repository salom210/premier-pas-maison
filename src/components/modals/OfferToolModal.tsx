import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, FileText, CheckCircle2 } from "lucide-react";
import type { Offre, OffreScenario } from "@/types/project";

interface OfferToolModalProps {
  open: boolean;
  onClose: () => void;
  offre: Offre;
  onUpdateOffre: (offre: Offre) => void;
  canProceed: boolean;
}

export function OfferToolModal({ 
  open, 
  onClose, 
  offre, 
  onUpdateOffre,
  canProceed 
}: OfferToolModalProps) {
  const [activeTab, setActiveTab] = useState<string>("prepare");
  const [localOffre, setLocalOffre] = useState<Offre>(offre);

  const updateScenario = (scenarioId: string, field: keyof OffreScenario, value: any) => {
    setLocalOffre({
      ...localOffre,
      scenarios: localOffre.scenarios.map(s => 
        s.id === scenarioId ? { ...s, [field]: value } : s
      )
    });
  };

  const generateDraft = () => {
    const activeScenario = localOffre.scenarios.find(s => s.id === localOffre.scenario_actif);
    if (!activeScenario || !activeScenario.montant) return;

    const clausesText = activeScenario.clauses.length > 0 
      ? `\n\nClauses suspensives :\n${activeScenario.clauses.map(c => `- ${c}`).join('\n')}`
      : '';

    const draft = `Bonjour,

Suite à ma visite du bien situé au [ADRESSE DU BIEN], je souhaite vous soumettre une offre d'achat.

Montant proposé : ${activeScenario.montant.toLocaleString('fr-FR')} €${clausesText}

Délai de réponse souhaité : ${activeScenario.delai_reponse} heures

${activeScenario.commentaire ? `Remarques complémentaires :\n${activeScenario.commentaire}\n\n` : ''}Je reste à votre disposition pour échanger sur cette proposition.

Cordialement,
[VOTRE NOM]`;

    setLocalOffre({ ...localOffre, draft });
    setActiveTab("draft");
  };

  const handleSave = () => {
    onUpdateOffre(localOffre);
    onClose();
  };

  const scenarioA = localOffre.scenarios.find(s => s.id === "A");
  const scenarioB = localOffre.scenarios.find(s => s.id === "B");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Outil d'aide à l'offre</DialogTitle>
          <DialogDescription>
            Préparez, comparez et générez votre offre en toute sécurité
          </DialogDescription>
        </DialogHeader>

        {!canProceed && (
          <div className="p-4 rounded-lg border border-warning/30 bg-warning/5 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Pré-requis non satisfaits
                </p>
                <p className="text-xs text-muted-foreground">
                  Complétez tous les éléments critiques des étapes précédentes avant de préparer votre offre.
                </p>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="prepare">Préparer</TabsTrigger>
            <TabsTrigger value="compare">Comparer</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="risks">Risques</TabsTrigger>
          </TabsList>

          <TabsContent value="prepare" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scénario A - Offre prudente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="montant-a">Montant de l'offre (€)</Label>
                  <Input
                    id="montant-a"
                    type="number"
                    value={scenarioA?.montant || ""}
                    onChange={(e) => updateScenario("A", "montant", parseFloat(e.target.value) || null)}
                    placeholder="Ex: 250000"
                  />
                </div>
                <div>
                  <Label htmlFor="clauses-a">Clauses suspensives (une par ligne)</Label>
                  <Textarea
                    id="clauses-a"
                    value={scenarioA?.clauses.join('\n') || ""}
                    onChange={(e) => updateScenario("A", "clauses", e.target.value.split('\n').filter(c => c.trim()))}
                    placeholder="Ex: Obtention du prêt&#10;Diagnostics conformes"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="delai-a">Délai de réponse (heures)</Label>
                  <Input
                    id="delai-a"
                    type="number"
                    value={scenarioA?.delai_reponse || 72}
                    onChange={(e) => updateScenario("A", "delai_reponse", parseInt(e.target.value) || 72)}
                  />
                </div>
                <div>
                  <Label htmlFor="comment-a">Commentaire additionnel</Label>
                  <Textarea
                    id="comment-a"
                    value={scenarioA?.commentaire || ""}
                    onChange={(e) => updateScenario("A", "commentaire", e.target.value)}
                    placeholder="Arguments ou contexte à mentionner"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scénario B - Offre alternative</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="montant-b">Montant de l'offre (€)</Label>
                  <Input
                    id="montant-b"
                    type="number"
                    value={scenarioB?.montant || ""}
                    onChange={(e) => updateScenario("B", "montant", parseFloat(e.target.value) || null)}
                    placeholder="Ex: 245000"
                  />
                </div>
                <div>
                  <Label htmlFor="clauses-b">Clauses suspensives (une par ligne)</Label>
                  <Textarea
                    id="clauses-b"
                    value={scenarioB?.clauses.join('\n') || ""}
                    onChange={(e) => updateScenario("B", "clauses", e.target.value.split('\n').filter(c => c.trim()))}
                    placeholder="Ex: Obtention du prêt"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="delai-b">Délai de réponse (heures)</Label>
                  <Input
                    id="delai-b"
                    type="number"
                    value={scenarioB?.delai_reponse || 72}
                    onChange={(e) => updateScenario("B", "delai_reponse", parseInt(e.target.value) || 72)}
                  />
                </div>
                <div>
                  <Label htmlFor="comment-b">Commentaire additionnel</Label>
                  <Textarea
                    id="comment-b"
                    value={scenarioB?.commentaire || ""}
                    onChange={(e) => updateScenario("B", "commentaire", e.target.value)}
                    placeholder="Arguments ou contexte à mentionner"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2">
              <Label>Scénario actif :</Label>
              <Button
                variant={localOffre.scenario_actif === "A" ? "default" : "outline"}
                size="sm"
                onClick={() => setLocalOffre({ ...localOffre, scenario_actif: "A" })}
              >
                Scénario A
              </Button>
              <Button
                variant={localOffre.scenario_actif === "B" ? "default" : "outline"}
                size="sm"
                onClick={() => setLocalOffre({ ...localOffre, scenario_actif: "B" })}
              >
                Scénario B
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="compare" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Scénario A</CardTitle>
                    {localOffre.scenario_actif === "A" && (
                      <Badge variant="default">Actif</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Montant</p>
                    <p className="text-lg font-semibold text-foreground">
                      {scenarioA?.montant ? `${scenarioA.montant.toLocaleString('fr-FR')} €` : "Non défini"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clauses</p>
                    <p className="text-sm text-foreground">
                      {scenarioA?.clauses.length || 0} clause(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Délai de réponse</p>
                    <p className="text-sm text-foreground">{scenarioA?.delai_reponse}h</p>
                  </div>
                  {scenarioA?.commentaire && (
                    <div>
                      <p className="text-xs text-muted-foreground">Commentaire</p>
                      <p className="text-sm text-foreground">{scenarioA.commentaire}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Scénario B</CardTitle>
                    {localOffre.scenario_actif === "B" && (
                      <Badge variant="default">Actif</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Montant</p>
                    <p className="text-lg font-semibold text-foreground">
                      {scenarioB?.montant ? `${scenarioB.montant.toLocaleString('fr-FR')} €` : "Non défini"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clauses</p>
                    <p className="text-sm text-foreground">
                      {scenarioB?.clauses.length || 0} clause(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Délai de réponse</p>
                    <p className="text-sm text-foreground">{scenarioB?.delai_reponse}h</p>
                  </div>
                  {scenarioB?.commentaire && (
                    <div>
                      <p className="text-xs text-muted-foreground">Commentaire</p>
                      <p className="text-sm text-foreground">{scenarioB.commentaire}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {scenarioA?.montant && scenarioB?.montant && (
              <Card className="bg-accent/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Différence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">
                    Écart de montant : <span className="font-semibold">
                      {Math.abs(scenarioA.montant - scenarioB.montant).toLocaleString('fr-FR')} €
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Le scénario {scenarioA.montant > scenarioB.montant ? "A" : "B"} est plus élevé
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="draft" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Générez un message prêt à envoyer basé sur le scénario actif
              </p>
              <Button onClick={generateDraft} size="sm" disabled={!canProceed}>
                <FileText className="h-4 w-4 mr-2" />
                Générer le draft
              </Button>
            </div>

            {localOffre.draft && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Message d'offre</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={localOffre.draft}
                    onChange={(e) => setLocalOffre({ ...localOffre, draft: e.target.value })}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Remplacez les [PLACEHOLDERS] avant envoi
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="risks" className="space-y-4">
            <Card className="border-warning/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning-foreground" />
                  Points de non-retour
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <p className="text-sm font-medium text-foreground mb-1">
                    ⛔ Après acceptation de l'offre
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Une fois l'offre acceptée, vous vous engagez juridiquement. Vous ne pourrez vous rétracter que dans les cas prévus par les clauses suspensives.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-sm font-medium text-foreground mb-1">
                    📝 Signature du compromis
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Le délai de rétractation de 10 jours commence à la signature du compromis de vente.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-sm font-medium text-foreground mb-1">
                    💰 Séquestre
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Le versement de la somme séquestrée (généralement 5-10% du prix) matérialise votre engagement.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statut de l'offre</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Offre acceptée</p>
                    <p className="text-xs text-muted-foreground">
                      Marquez cette case uniquement après acceptation formelle
                    </p>
                  </div>
                  <Button
                    variant={localOffre.offre_acceptee ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLocalOffre({ ...localOffre, offre_acceptee: !localOffre.offre_acceptee })}
                  >
                    {localOffre.offre_acceptee ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Acceptée
                      </>
                    ) : (
                      "Marquer comme acceptée"
                    )}
                  </Button>
                </div>

                {localOffre.offre_acceptee && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Point de non-retour franchi
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vous êtes maintenant engagé juridiquement. Consultez vos clauses suspensives pour connaître les conditions de rétractation possibles.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
