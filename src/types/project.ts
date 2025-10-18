export interface User {
  id: string;
  stage: string;
  copropriete: boolean;
  budget_max: number;
  travaux_prevus: boolean;
  anxiete_principale: string;
}

export interface Actor {
  id: string;
  label: string;
}

export interface DocDef {
  key: string;
  label: string;
}

export interface Catalogs {
  actors: Actor[];
  docs_defs: DocDef[];
}

export interface GatingRule {
  when_step: string;
  requires: Array<{ type: string; id?: string; step?: string }>;
  message_if_blocked: string;
}

export interface NonRetour {
  step: string;
  trigger: string;
  label: string;
  explanation: string;
}

export interface MissingInfoRule {
  applies_to_step: string;
  if: Array<{ type: string; equals: boolean }>;
  must_have_docs: Array<{ doc_key: string; ask_to: string }>;
}

export interface Rules {
  gating: GatingRule[];
  non_retours: NonRetour[];
  missing_info_rules: MissingInfoRule[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  critical: boolean;
  status: "done" | "in_progress" | "todo";
  related_docs?: string[];
}

export interface MissingInfo {
  id: string;
  label: string;
  doc_key: string;
  ask_to: string;
  reason: string;
  status: "absent" | "present";
}

export interface Decision {
  id: string;
  label: string;
  rationale?: string;
  date: string;
}

export interface Blocker {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  explanation: string;
}

export interface Step {
  id: string;
  label: string;
  status: "done" | "in_progress" | "todo";
  checklist: ChecklistItem[];
  missing_info: MissingInfo[];
  decisions: Decision[];
  blockers: Blocker[];
  next_allowed: boolean;
}

export interface UIState {
  last_open_step_id: string;
  show_only_blockers: boolean;
}

export interface PropertyInfo {
  adresse: string;
  code_postal: string;
  ville: string;
  surface_habitable: number;
  nombre_pieces: number;
  nombre_chambres: number;
  etage?: number;
  ascenseur: boolean;
  balcon_terrasse: boolean;
  surface_exterieure?: number;
  parking: boolean;
  cave: boolean;
  annee_construction?: number;
  etat: 'excellent' | 'bon' | 'a-renover' | 'travaux-lourds';
  prix_demande: number;
  charges_mensuelles?: number;
  taxe_fonciere?: number;
  dpe?: string;
}

export interface MarketAnalysis {
  prix_moyen_m2_ville: number;
  prix_moyen_m2_quartier: number;
  prix_min_m2: number;
  prix_max_m2: number;
  nombre_transactions_similaires: number;
  valeur_estimee_basse: number;
  valeur_estimee_haute: number;
  valeur_estimee_mediane: number;
  ecart_prix_demande_vs_marche: number;
  conclusion: 'survalorise' | 'correct' | 'bonne-affaire';
  derniere_maj: string;
}

export interface OffreScenario {
  id: string;
  nom: string;
  strategie: 'conservative' | 'balanced' | 'aggressive';
  montant: number | null;
  clauses: string[];
  delai_reponse: number;
  commentaire: string;
  probabilite_acceptation: number;
  risque: 'faible' | 'modéré' | 'élevé';
  plus_value_potentielle: string;
  justification: string;
}

export interface Market {
  ref_price_m2: number | null;
  source: string | null;
}

export interface Projection {
  taux_annuel: number;
  frais_revente: number;
  valeur_future: number | null;
  gain_net: number | null;
}

export interface Offre {
  property_info: PropertyInfo | null;
  market_analysis: MarketAnalysis | null;
  scenarios: OffreScenario[];
  scenario_actif: string;
  draft: string;
  offre_acceptee: boolean;
  market: Market;
  projection: Projection;
}

export interface ProjectData {
  user: User;
  catalogs: Catalogs;
  rules: Rules;
  steps: Step[];
  ui: UIState;
  offre: Offre;
}
