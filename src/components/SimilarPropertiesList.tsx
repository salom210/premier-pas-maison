import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SimilarProperty } from "@/types/project";

interface SimilarPropertiesListProps {
  properties: SimilarProperty[];
  currentPropertyPrice: number;
}

export function SimilarPropertiesList({ properties, currentPropertyPrice }: SimilarPropertiesListProps) {
  if (!properties || properties.length === 0) {
    return null;
  }

  const getPriceComparison = (prixVente: number) => {
    const diff = ((prixVente - currentPropertyPrice) / currentPropertyPrice) * 100;
    if (Math.abs(diff) < 5) {
      return { icon: Minus, color: "text-muted-foreground", label: "Prix similaire" };
    } else if (diff > 0) {
      return { icon: TrendingUp, color: "text-destructive", label: `+${diff.toFixed(1)}%` };
    } else {
      return { icon: TrendingDown, color: "text-success", label: `${diff.toFixed(1)}%` };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Biens similaires vendus récemment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {properties.map((property, index) => {
            const prixM2 = Math.round(property.prix_vente / property.surface);
            const comparison = getPriceComparison(property.prix_vente);
            const ComparisonIcon = comparison.icon;

            return (
              <div 
                key={property.id} 
                className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">
                        {property.adresse || `Bien similaire #${index + 1}`}
                      </h4>
                      {property.distance_km && (
                        <Badge variant="outline" className="text-xs">
                          {property.distance_km} km
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{property.surface} m²</span>
                      <span>{property.nombre_pieces} pièces</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(property.date_vente).toLocaleDateString('fr-FR', { 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-semibold text-sm">
                      {property.prix_vente.toLocaleString('fr-FR')} €
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {prixM2.toLocaleString('fr-FR')} €/m²
                    </div>
                    <div className={`flex items-center justify-end gap-1 text-xs ${comparison.color}`}>
                      <ComparisonIcon className="h-3 w-3" />
                      {comparison.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {properties.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
            Ces biens ont des caractéristiques similaires au vôtre et se sont vendus récemment dans le secteur.
            Les variations de prix peuvent s'expliquer par l'étage, l'état, ou les équipements.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
