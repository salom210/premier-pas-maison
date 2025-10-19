import { useState, useEffect, useCallback } from "react";
import { OfferToolContent } from "@/components/OfferToolContent";
import type { Offre } from "@/types/project";

export default function OffreTool() {
  const [offre, setOffre] = useState<Offre>({
    property_info: null,
    market_analysis: null,
    chatgpt_analysis: null,
    fiabilite: null,
    scenarios: [],
    scenario_actif: "",
    draft: "",
    offre_acceptee: false,
    market: { ref_price_m2: null, source: null },
    projection: { taux_annuel: 0, frais_revente: 0, valeur_future: null, gain_net: null }
  });

  // Fonction pour vider complètement le localStorage (utile pour le debug)
  const clearAllData = () => {
    localStorage.removeItem('standalone-offer');
    setOffre({
      property_info: null,
      market_analysis: null,
      chatgpt_analysis: null,
      fiabilite: null,
      scenarios: [],
      scenario_actif: "",
      draft: "",
      offre_acceptee: false,
      market: { ref_price_m2: null, source: null },
      projection: { taux_annuel: 0, frais_revente: 0, valeur_future: null, gain_net: null }
    });
    console.log('🧹 Toutes les données ont été supprimées');
  };

  // Exposer la fonction globalement pour le debug (à supprimer en production)
  if (typeof window !== 'undefined') {
    (window as any).clearOfferData = clearAllData;
  }

  // Charger l'offre depuis localStorage au montage
  useEffect(() => {
    const savedOffre = localStorage.getItem('standalone-offer');
    if (savedOffre) {
      try {
        const parsedOffre = JSON.parse(savedOffre);

        // Nettoyer les anciens scénarios personnalisés (ceux qui ne sont pas générés par l'IA)
        if (parsedOffre.scenarios) {
          const originalLength = parsedOffre.scenarios.length;
          parsedOffre.scenarios = parsedOffre.scenarios.filter((scenario: any) =>
            scenario.id?.includes('-ai') || scenario.id?.startsWith('conservative-ai') ||
            scenario.id?.startsWith('balanced-ai') || scenario.id?.startsWith('aggressive-ai')
          );

          // Si des scénarios ont été supprimés, sauvegarder la version nettoyée
          if (parsedOffre.scenarios.length !== originalLength) {
            console.log('🧹 Nettoyage des scénarios personnalisés effectué');
            localStorage.setItem('standalone-offer', JSON.stringify(parsedOffre));
          }
        }

        setOffre(parsedOffre);
      } catch (error) {
        console.error('Error loading saved offer:', error);
        // En cas d'erreur, vider le localStorage
        localStorage.removeItem('standalone-offer');
      }
    }
  }, []);

  const handleUpdateOffre = useCallback((updatedOffre: Offre) => {
    const offreToSave = {
      ...updatedOffre,
      derniere_maj: new Date().toISOString()
    };
    
    setOffre(offreToSave);
    localStorage.setItem('standalone-offer', JSON.stringify(offreToSave));
  }, []);

  const canProceed = Boolean(
    offre.property_info?.adresse &&
    offre.property_info?.code_postal &&
    offre.property_info?.ville &&
    offre.property_info?.surface_habitable &&
    offre.property_info?.nombre_pieces
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Outil d'aide à l'offre</h1>
        <p className="text-muted-foreground mt-2">
          Analysez le marché, générez des scénarios d'offre et créez votre modèle d'offre personnalisé avec l'IA.
        </p>
      </div>

      <OfferToolContent
        offre={offre}
        onUpdateOffre={handleUpdateOffre}
        canProceed={canProceed}
      />
    </div>
  );
}
