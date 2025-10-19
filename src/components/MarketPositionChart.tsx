interface MarketPositionChartProps {
  prixDemande: number;
  valeurBasse: number;
  valeurHaute: number;
  valeurMediane: number;
  surface: number;
}

export function MarketPositionChart({ 
  prixDemande, 
  valeurBasse, 
  valeurHaute,
  valeurMediane,
  surface
}: MarketPositionChartProps) {
  // Déterminer les bornes dynamiques incluant le prix demandé
  const valeurMin = Math.min(valeurBasse, prixDemande);
  const valeurMax = Math.max(valeurHaute, prixDemande);
  const plageTotal = valeurMax - valeurMin;
  
  // Recalculer toutes les positions par rapport aux nouvelles bornes
  const positionValeurBasse = ((valeurBasse - valeurMin) / plageTotal) * 100;
  const positionValeurHaute = ((valeurHaute - valeurMin) / plageTotal) * 100;
  const positionMediane = ((valeurMediane - valeurMin) / plageTotal) * 100;
  const positionPrixDemande = ((prixDemande - valeurMin) / plageTotal) * 100;
  
  // Calcul des zones basées sur la plage totale (±5% autour de la médiane)
  const margeZoneVerte = plageTotal * 0.05; // 5% de la plage totale
  const debutZoneVerte = valeurMediane - margeZoneVerte;
  const finZoneVerte = valeurMediane + margeZoneVerte;
  
  // Calcul des largeurs brutes en pourcentage
  let largeurZoneBleue = ((debutZoneVerte - valeurMin) / plageTotal) * 100;
  let largeurZoneVerte = ((finZoneVerte - debutZoneVerte) / plageTotal) * 100;
  let largeurZoneRouge = ((valeurMax - finZoneVerte) / plageTotal) * 100;
  
  // Garantir une largeur minimale de 5% pour chaque zone
  const minWidth = 5;
  largeurZoneBleue = Math.max(largeurZoneBleue, minWidth);
  largeurZoneVerte = Math.max(largeurZoneVerte, minWidth);
  largeurZoneRouge = Math.max(largeurZoneRouge, minWidth);
  
  // Normaliser pour que la somme fasse 100%
  const somme = largeurZoneBleue + largeurZoneVerte + largeurZoneRouge;
  largeurZoneBleue = (largeurZoneBleue / somme) * 100;
  largeurZoneVerte = (largeurZoneVerte / somme) * 100;
  largeurZoneRouge = (largeurZoneRouge / somme) * 100;

  return (
    <div className="w-full space-y-6">
      {/* Graphique principal */}
      <div className="flex justify-center">
        <div className="w-full max-w-2xl space-y-4">
          {/* Barre de marché */}
          <div className="relative h-40">
            {/* Barre horizontale avec zones colorées */}
            <div className="absolute left-8 right-8 h-6 top-14 rounded-full overflow-hidden flex shadow-lg">
              {/* Zone basse (bleu pastel gradient) */}
              <div 
                className="transition-all duration-300"
                style={{ 
                  width: `${largeurZoneBleue}%`,
                  background: 'linear-gradient(135deg, hsl(210, 85%, 80%), hsl(220, 80%, 85%))'
                }}
              />
              {/* Zone raisonnable (vert pastel gradient) */}
              <div 
                className="transition-all duration-300"
                style={{ 
                  width: `${largeurZoneVerte}%`,
                  background: 'linear-gradient(135deg, hsl(140, 65%, 75%), hsl(150, 60%, 80%))'
                }}
              />
              {/* Zone survalorisée (rouge/rose pastel gradient) */}
              <div 
                className="transition-all duration-300"
                style={{ 
                  width: `${largeurZoneRouge}%`,
                  background: 'linear-gradient(135deg, hsl(350, 70%, 80%), hsl(10, 75%, 85%))'
                }}
              />
            </div>
            
            {/* Curseur prix demandé */}
            <div 
              className="absolute top-0 -translate-x-1/2 z-20 transition-all duration-300"
              style={{ left: `calc(2rem + (100% - 4rem) * ${positionPrixDemande / 100})` }}
            >
              <div className="flex flex-col items-center">
                <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-md">
                  {(prixDemande / 1000).toFixed(0)}k€
                  <div className="text-xs font-normal mt-0.5">
                    {(prixDemande / surface).toFixed(0)}€/m²
                  </div>
                </div>
                {/* Cercle sur la jauge */}
                <div 
                  className="absolute w-4 h-4 bg-primary rounded-full shadow-lg border-2 border-background"
                  style={{ 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    top: '60px'
                  }}
                />
              </div>
            </div>
            
            {/* Valeur Min - gauche de la jauge */}
            <div className="absolute bottom-2 left-8 -translate-x-1/2">
              <div className="text-xs text-muted-foreground font-semibold">
                {(valeurBasse / 1000).toFixed(0)}k€
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {(valeurBasse / surface).toFixed(0)}€/m²
              </div>
            </div>
            
            {/* Prix moyen au m² - centre de la jauge */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
              <div className="text-xs text-muted-foreground font-semibold">
                {(valeurMediane / 1000).toFixed(0)}k€
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {(valeurMediane / surface).toFixed(0)}€/m²
              </div>
            </div>
            
            {/* Valeur Max - droite de la jauge */}
            <div className="absolute bottom-2 right-8 translate-x-1/2">
              <div className="text-xs text-muted-foreground font-semibold">
                {(valeurHaute / 1000).toFixed(0)}k€
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {(valeurHaute / surface).toFixed(0)}€/m²
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Légende compacte */}
      <div className="flex flex-wrap justify-center gap-4 text-xs border-t pt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, hsl(210, 85%, 80%), hsl(220, 80%, 85%))' }} />
          <span className="text-muted-foreground">Fourchette basse</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, hsl(140, 65%, 75%), hsl(150, 60%, 80%))' }} />
          <span className="text-muted-foreground">Zone raisonnable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg, hsl(350, 70%, 80%), hsl(10, 75%, 85%))' }} />
          <span className="text-muted-foreground">Survalorisé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-foreground font-medium">Prix demandé ({(prixDemande / 1000).toFixed(0)}k€)</span>
        </div>
      </div>
    </div>
  );
}
