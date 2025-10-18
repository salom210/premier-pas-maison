import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, ReferenceLine, Cell } from 'recharts';

interface MarketPositionChartProps {
  prixDemande: number;
  valeurBasse: number;
  valeurHaute: number;
  valeurMediane: number;
}

export function MarketPositionChart({ 
  prixDemande, 
  valeurBasse, 
  valeurHaute,
  valeurMediane
}: MarketPositionChartProps) {
  // Calcul des zones
  const zoneBasse = valeurMediane * 0.9; // -10% de la médiane
  const zoneHaute = valeurMediane * 1.1; // +10% de la médiane

  // Calcul des largeurs de chaque zone
  const largeurZoneBasse = zoneBasse - valeurBasse;
  const largeurZoneRaisonnable = zoneHaute - zoneBasse;
  const largeurZoneSurvalorisee = valeurHaute - zoneHaute;

  const data = [
    {
      name: 'Marché',
      zoneBasse: largeurZoneBasse,
      zoneRaisonnable: largeurZoneRaisonnable,
      zoneSurvalorisee: largeurZoneSurvalorisee,
    }
  ];

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart 
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
          barCategoryGap="20%"
        >
          <XAxis 
            type="number" 
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => `${((valeurBasse + value) / 1000).toFixed(0)}k€`}
            domain={[0, valeurHaute - valeurBasse]}
          />
          <YAxis 
            type="category" 
            dataKey="name"
            tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
            stroke="hsl(var(--muted-foreground))"
          />
          
          {/* Zones empilées */}
          <Bar dataKey="zoneBasse" stackId="stack" fill="#3b82f6" radius={[4, 0, 0, 4]} />
          <Bar dataKey="zoneRaisonnable" stackId="stack" fill="#22c55e" />
          <Bar dataKey="zoneSurvalorisee" stackId="stack" fill="#ef4444" radius={[0, 4, 4, 0]} />
          
          {/* Ligne de référence pour la valeur médiane */}
          <ReferenceLine 
            x={valeurMediane - valeurBasse} 
            stroke="hsl(var(--foreground))" 
            strokeWidth={2}
            strokeDasharray="3 3"
          />
          
          {/* Ligne de référence pour le prix demandé */}
          <ReferenceLine 
            x={prixDemande - valeurBasse} 
            stroke="hsl(var(--destructive))" 
            strokeWidth={3}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Légende personnalisée */}
      <div className="mt-4 space-y-2 border-t pt-3">
        <p className="text-xs font-semibold text-muted-foreground">Légende :</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-foreground">Fourchette basse</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-foreground">Zone raisonnable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-foreground">Survalorisé</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-foreground border-dashed bg-transparent" />
            <span className="text-foreground">Valeur médiane ({(valeurMediane / 1000).toFixed(0)}k€)</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <div className="w-3 h-1.5 rounded-sm bg-destructive" />
            <span className="text-foreground font-medium">Prix demandé ({(prixDemande / 1000).toFixed(0)}k€)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
