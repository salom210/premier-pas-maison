import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, BarChart3, TestTube, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export function TestsInfoCard() {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-800 flex items-center gap-2">
          <Info className="h-5 w-5" />
          À propos des tests DVF
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
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Migration DVF nationale
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Priorité par pièces
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Analyse intelligente
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Fallback 2025→2024
          </span>
        </div>
        
        <div className="bg-white/50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-700">
              <strong>Note :</strong> Les tests utilisent les vraies données DVF du département 93. 
              Le chargement peut prendre quelques secondes selon la taille des fichiers.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
