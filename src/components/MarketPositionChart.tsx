import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Legend } from 'recharts';

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
  const data = [
    { name: 'Valeur basse', value: valeurBasse, color: 'hsl(var(--success))' },
    { name: 'Valeur médiane', value: valeurMediane, color: 'hsl(var(--primary))' },
    { name: 'Valeur haute', value: valeurHaute, color: 'hsl(var(--warning))' },
    { name: 'Prix demandé', value: prixDemande, color: 'hsl(var(--destructive))' }
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Legend />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
