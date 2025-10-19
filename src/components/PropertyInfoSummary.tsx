import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Home, MapPin, Ruler, Euro, Calendar, ArrowUpDown, Sun, Car, Package, Leaf } from "lucide-react";
import type { PropertyInfo } from "@/types/project";

interface PropertyInfoSummaryProps {
  propertyInfo: PropertyInfo;
  onEdit: () => void;
}

export function PropertyInfoSummary({ propertyInfo, onEdit }: PropertyInfoSummaryProps) {
  const formatEuros = (value: number) => {
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  };

  const getEtatBadge = (etat: string) => {
    switch (etat) {
      case 'excellent': return <Badge variant="default" className="bg-success">Excellent</Badge>;
      case 'bon': return <Badge variant="secondary">Bon</Badge>;
      case 'a-renover': return <Badge variant="outline">À rénover</Badge>;
      case 'travaux-lourds': return <Badge variant="destructive">Travaux lourds</Badge>;
      default: return <Badge variant="secondary">{etat}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Informations du bien
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Adresse */}
          <div className="flex items-start gap-3 pb-3 border-b">
            <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm font-medium text-foreground">{propertyInfo.adresse}</p>
              <p className="text-xs text-muted-foreground">{propertyInfo.code_postal} {propertyInfo.ville}</p>
            </div>
          </div>

          {/* Caractéristiques principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Ruler className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Surface</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{propertyInfo.surface_habitable} m²</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Home className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Pièces</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {propertyInfo.nombre_pieces} pièces
                {propertyInfo.nombre_chambres > 0 && ` (${propertyInfo.nombre_chambres} ch.)`}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Euro className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Prix demandé</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{formatEuros(propertyInfo.prix_demande)}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(propertyInfo.prix_demande / propertyInfo.surface_habitable).toLocaleString()} €/m²
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">État</span>
              </div>
              <div className="mt-1">
                {getEtatBadge(propertyInfo.etat)}
              </div>
            </div>
          </div>

          {/* Informations supplémentaires */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {propertyInfo.etage !== undefined && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Home className="h-3 w-3" />
                Étage {propertyInfo.etage}{propertyInfo.dernier_etage ? ' (dernier)' : ''}
              </Badge>
            )}
            {propertyInfo.ascenseur && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <ArrowUpDown className="h-3 w-3" />
                Ascenseur
              </Badge>
            )}
            {propertyInfo.balcon_terrasse && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Sun className="h-3 w-3" />
                Balcon/Terrasse{propertyInfo.surface_exterieure ? ` (${propertyInfo.surface_exterieure}m²)` : ''}
              </Badge>
            )}
            {propertyInfo.parking && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Car className="h-3 w-3" />
                Parking
              </Badge>
            )}
            {propertyInfo.cave && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Package className="h-3 w-3" />
                Cave
              </Badge>
            )}
            {propertyInfo.dpe && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Leaf className="h-3 w-3" />
                DPE: {propertyInfo.dpe}
              </Badge>
            )}
            {propertyInfo.annee_construction && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Calendar className="h-3 w-3" />
                Construit en {propertyInfo.annee_construction}
              </Badge>
            )}
          </div>

          {/* Charges et taxe */}
          {(propertyInfo.charges_trimestrielles || propertyInfo.taxe_fonciere) && (
            <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
              {propertyInfo.charges_trimestrielles && (
                <span>Charges: {propertyInfo.charges_trimestrielles}€/trim.</span>
              )}
              {propertyInfo.taxe_fonciere && (
                <span>Taxe foncière: {propertyInfo.taxe_fonciere}€/an</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
