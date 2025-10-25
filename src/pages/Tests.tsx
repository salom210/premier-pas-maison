import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoomsPriorityTest } from "@/components/RoomsPriorityTest";
import { IntegrationTest } from "@/components/IntegrationTest";
import { DVFProgressTest } from "@/components/DVFProgressTest";
import { TestsInfoCard } from "@/components/TestsInfoCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TestTube, Zap, Database } from "lucide-react";

export default function TestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tests DVF</h1>
        <p className="text-muted-foreground mt-2">
          Tests et validation des fonctionnalités de migration DVF nationale et de priorité par nombre de pièces.
        </p>
      </div>

      <TestsInfoCard />

      <Tabs defaultValue="progress-test" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="progress-test" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Chargement Progressif
          </TabsTrigger>
          <TabsTrigger value="rooms-test" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Priorité Pièces
          </TabsTrigger>
          <TabsTrigger value="integration-test" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Intégration
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="progress-test" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Test du chargement progressif DVF
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ce test vérifie le chargement progressif des données DVF avec suivi en temps réel, 
                incluant la migration vers les fichiers DVF nationaux et l'analyse intelligente.
              </p>
              <DVFProgressTest />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rooms-test" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Test de priorité par nombre de pièces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ce test vérifie la logique de priorité par nombre de pièces avec système de pondération, 
                incluant les statistiques détaillées par groupe de pièces.
              </p>
              <RoomsPriorityTest />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="integration-test" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Tests d'intégration complets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Tests automatisés complets pour vérifier l'intégration de toutes les fonctionnalités 
                de migration DVF nationale et de priorité par nombre de pièces.
              </p>
              <IntegrationTest />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
