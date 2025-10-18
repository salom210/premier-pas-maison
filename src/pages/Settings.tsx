import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Settings = () => {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Paramètres</h1>
        <p className="text-muted-foreground">
          Configuration de votre espace personnel
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Paramètres à venir</CardTitle>
          <CardDescription>
            Cette section sera enrichie au fur et à mesure du développement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Vous pourrez bientôt gérer vos préférences, notifications et informations personnelles.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
