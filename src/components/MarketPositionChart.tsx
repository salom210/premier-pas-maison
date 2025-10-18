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
  // Calcul de la plage totale
  const plageTotal = valeurHaute - valeurBasse;
  
  // Calcul des positions en pourcentage
  const positionMediane = ((valeurMediane - valeurBasse) / plageTotal) * 100;
  const positionPrixDemande = ((prixDemande - valeurBasse) / plageTotal) * 100;
  
  // Calcul des zones (médiane ±10%)
  const zoneBasse = valeurMediane * 0.9; // -10% de la médiane
  const zoneHaute = valeurMediane * 1.1; // +10% de la médiane
  
  const positionZoneBasse = ((zoneBasse - valeurBasse) / plageTotal) * 100;
  const positionZoneHaute = ((zoneHaute - valeurBasse) / plageTotal) * 100;

  return (
    <div className="w-full space-y-6">
      {/* Graphique principal */}
      <div className="flex justify-center">
        <div className="w-full max-w-2xl space-y-4">
          {/* Barre de marché */}
          <div className="relative h-32 px-8">
            {/* Barre horizontale avec zones colorées */}
            <div className="absolute w-full h-10 top-14 rounded-full overflow-hidden flex shadow-lg">
              {/* Zone basse (bleu) */}
              <div 
                className="bg-blue-500 transition-all duration-300"
                style={{ width: `${positionZoneBasse}%` }}
              />
              {/* Zone raisonnable (vert) */}
              <div 
                className="bg-green-500 transition-all duration-300"
                style={{ width: `${positionZoneHaute - positionZoneBasse}%` }}
              />
              {/* Zone survalorisée (rouge) */}
              <div 
                className="bg-red-500 transition-all duration-300"
                style={{ width: `${100 - positionZoneHaute}%` }}
              />
            </div>
            
            {/* Curseur prix demandé */}
            <div 
              className="absolute top-0 -translate-x-1/2 z-10 transition-all duration-300"
              style={{ left: `${positionPrixDemande}%` }}
            >
              <div className="flex flex-col items-center">
                <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap mb-2 shadow-md">
                  {(prixDemande / 1000).toFixed(0)}k€
                </div>
                <div className="w-1 h-12 bg-primary rounded-full shadow-lg" />
                <div className="w-3 h-3 bg-primary rounded-full shadow-lg" />
              </div>
            </div>
            
            {/* Marqueur valeur médiane (discret) */}
            <div 
              className="absolute bottom-2 -translate-x-1/2 transition-all duration-300"
              style={{ left: `${positionMediane}%` }}
            >
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-3 bg-muted-foreground/40 rounded-full" />
                <div className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">
                  Médiane
                </div>
              </div>
            </div>
          </div>

          {/* Indicateurs min/max */}
          <div className="flex justify-between text-xs text-muted-foreground px-8">
            <span>{(valeurBasse / 1000).toFixed(0)}k€</span>
            <span>{(valeurHaute / 1000).toFixed(0)}k€</span>
          </div>
        </div>
      </div>

      {/* Légende compacte */}
      <div className="flex flex-wrap justify-center gap-4 text-xs border-t pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-foreground">Fourchette basse</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-foreground">Zone raisonnable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-foreground">Survalorisé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-foreground font-medium">Prix demandé ({(prixDemande / 1000).toFixed(0)}k€)</span>
        </div>
      </div>
    </div>
  );
}
