import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { SimilarProperty } from "@/types/project";

interface SimilarPropertiesListProps {
  properties: SimilarProperty[];
  currentPropertyPriceM2: number;
  currentPropertyInfo?: {
    surface_habitable: number;
    nombre_pieces: number;
    ville: string;
    type_bien?: string;
  };
}

export function SimilarPropertiesList({ properties, currentPropertyPriceM2, currentPropertyInfo }: SimilarPropertiesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  if (!properties || properties.length === 0) {
    return null;
  }

  const totalPages = Math.ceil(properties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProperties = properties.slice(startIndex, endIndex);

  const getPriceComparison = (prixVente: number, surface: number) => {
    if (!currentPropertyPriceM2 || currentPropertyPriceM2 <= 0) {
      return { icon: Minus, color: "text-muted-foreground", label: "Prix demandé indisponible" };
    }
    
    const prixM2Vendu = prixVente / surface;
    const diff = ((prixM2Vendu - currentPropertyPriceM2) / currentPropertyPriceM2) * 100;
    
    if (!Number.isFinite(diff) || Math.abs(diff) < 5) {
      return { icon: Minus, color: "text-muted-foreground", label: "Prix similaire" };
    }
    if (diff > 0) {
      return { icon: TrendingUp, color: "text-destructive", label: `+${diff.toFixed(1)}%` };
    }
    return { icon: TrendingDown, color: "text-success", label: `${diff.toFixed(1)}%` };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <div className="flex items-center gap-2">
              {currentPropertyInfo ? (
                <>
                  {currentPropertyInfo.type_bien || 'Appartements'} similaires vendus récemment
                </>
              ) : (
                'Biens similaires vendus récemment'
              )}
            </div>
            <Badge variant="secondary" className="ml-2">
              {properties.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      {isExpanded && (
        <CardContent>
        <div className="space-y-3">
          {paginatedProperties.map((property, index) => {
            const prixM2 = Math.round(property.prix_vente / property.surface);
            const comparison = getPriceComparison(property.prix_vente, property.surface);
            const ComparisonIcon = comparison.icon;

            return (
              <div 
                key={property.id} 
                className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    {/* Adresse en titre */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">
                        {property.adresse || `${property.surface}m²`}
                      </h4>
                      {property.distance_km !== undefined && property.distance_km > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {property.distance_km < 1 
                            ? `${Math.round(property.distance_km * 1000)}m`
                            : `${Math.round(property.distance_km)}km`
                          }
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {property.surface > 0 && (
                        <span>{property.surface}m²</span>
                      )}
                      {property.nombre_pieces > 0 && (
                        <span>{property.nombre_pieces} pièces</span>
                      )}
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
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 pt-4 border-t">
            {/* Aria label pour l'accessibilité */}
            <nav aria-label="Pagination des transactions similaires" className="w-full">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Compteur */}
                <p className="text-xs text-muted-foreground text-center sm:text-left">
                  Page {currentPage} sur {totalPages} ({properties.length} résultat{properties.length > 1 ? 's' : ''})
                </p>
                
                {/* Contrôles de pagination */}
                <div className="flex items-center gap-1">
                  {/* Bouton précédent */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    aria-label="Page précédente"
                    aria-disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Page précédente</span>
                  </Button>

                  {/* Numéros de pages */}
                  <div className="flex items-center gap-1">
                    {/* Afficher les numéros de page */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="min-w-[2rem]"
                          aria-label={`Page ${pageNum}`}
                          aria-current={currentPage === pageNum ? 'page' : undefined}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Bouton suivant */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Page suivante"
                    aria-disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Page suivante</span>
                  </Button>
                </div>
              </div>
            </nav>
          </div>
        )}
        
        {properties.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
            Ces biens ont des caractéristiques similaires au vôtre et se sont vendus récemment dans le secteur.
            Les variations de prix peuvent s'expliquer par l'étage, l'état, ou les équipements.
          </p>
        )}
        </CardContent>
      )}
    </Card>
  );
}
