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

      {/* Informations sur les tests */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Informations sur les tests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-blue-700">
            Ces tests vous permettent de valider et comprendre les fonctionnalités de migration 
            vers les fichiers DVF nationaux et de priorité par nombre de pièces.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Chargement Progressif</h4>
                <p className="text-xs text-blue-600 mt-1">
                  Teste le chargement des données DVF avec suivi en temps réel
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Priorité Pièces</h4>
                <p className="text-xs text-blue-600 mt-1">
                  Valide la logique de priorité par nombre de pièces
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <TestTube className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Intégration</h4>
                <p className="text-xs text-blue-600 mt-1">
                  Tests automatisés complets de toutes les fonctionnalités
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Migration DVF nationale
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Priorité par pièces
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Analyse intelligente
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Fallback 2025→2024
            </span>
          </div>
          
          <div className="bg-white/50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <div className="text-xs text-blue-700">
                <strong>Note :</strong> Les tests utilisent les vraies données DVF du département 93. 
                Le chargement peut prendre quelques secondes selon la taille des fichiers.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
