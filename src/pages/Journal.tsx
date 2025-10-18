import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface JournalEntry {
  id: string;
  date: string;
  step: string;
  decision: string;
  rationale?: string;
}

const mockEntries: JournalEntry[] = [
  {
    id: "1",
    date: "2025-01-15",
    step: "Définir votre projet",
    decision: "Budget maximal fixé à 350 000 €",
    rationale: "Basé sur ma capacité d'emprunt et mon apport personnel de 50 000 €",
  },
  {
    id: "2",
    date: "2025-01-18",
    step: "Définir votre projet",
    decision: "Zone de recherche : quartiers Nord et Est",
    rationale: "Proximité avec mon lieu de travail et disponibilité de crèches",
  },
];

const Journal = () => {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Journal de décisions
        </h1>
        <p className="text-muted-foreground">
          Historique de vos choix importants tout au long du parcours
        </p>
      </div>

      {mockEntries.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Vos décisions seront enregistrées ici au fur et à mesure de votre avancement.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {mockEntries.map((entry) => (
            <Card key={entry.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{entry.decision}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {entry.step}
                    </Badge>
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
