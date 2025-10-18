import { ProjectData } from "@/types/project";

export const mockProjectData: ProjectData = {
  user: {
    id: "u_demo",
    stage: "pre_projet",
    copropriete: true,
    budget_max: 350000,
    travaux_prevus: true,
    anxiete_principale: "process",
  },
  catalogs: {
    actors: [
      { id: "notaire", label: "Notaire" },
      { id: "agent", label: "Agent immobilier" },
      { id: "syndic", label: "Syndic" },
      { id: "banque", label: "Banque / Courtier" },
      { id: "user", label: "Vous" },
    ],
    docs_defs: [
      { key: "pv_ag_derniere", label: "PV dernière AG" },
      { key: "releve_charges_12m", label: "Relevé charges 12m" },
      { key: "etat_sinistres_3ans", label: "Sinistres 3 ans" },
      { key: "devis_toiture", label: "Devis toiture (si soupçon)" },
    ],
  },
  rules: {
    gating: [
      {
        when_step: "recherche",
        requires: [
          { type: "checklist_done", id: "chk_pp_03" },
          { type: "checklist_done", id: "chk_b_01" },
        ],
        message_if_blocked:
          "Validez fenêtre de tir et budget réaliste avant la recherche.",
      },
      {
        when_step: "visites",
        requires: [
          { type: "checklist_done", id: "chk_r_02" },
          { type: "no_missing_info_step", step: "recherche" },
        ],
        message_if_blocked:
          "Consultez le PV d'AG et résolvez les manquants avant visites.",
      },
      {
        when_step: "offre",
        requires: [
          { type: "checklist_group_criticals_done", step: "visites" },
          { type: "no_missing_info_step", step: "visites" },
        ],
        message_if_blocked:
          "Sécurisez critiques de visite et infos manquantes avant l'offre.",
      },
      {
        when_step: "compromis",
        requires: [{ type: "checklist_done", id: "chk_o_02" }],
        message_if_blocked: "Précisez vos clauses sensibles avant compromis.",
      },
    ],
    non_retours: [
      {
        step: "offre",
        trigger: "offre_acceptee",
        label: "Offre acceptée",
        explanation: "Retrait limité aux clauses.",
      },
      {
        step: "compromis",
        trigger: "compromis_signe",
        label: "Compromis signé",
        explanation: "Engagement juridique fort.",
      },
    ],
    missing_info_rules: [
      {
        applies_to_step: "recherche",
        if: [{ type: "user.copropriete", equals: true }],
        must_have_docs: [
          { doc_key: "pv_ag_derniere", ask_to: "syndic" },
          { doc_key: "releve_charges_12m", ask_to: "agent" },
          { doc_key: "etat_sinistres_3ans", ask_to: "syndic" },
        ],
      },
    ],
  },
  steps: [
    {
      id: "pre_projet",
      label: "Pré-projet",
      status: "in_progress",
      checklist: [
        {
          id: "chk_pp_01",
          label: "Parcourir les étapes",
          critical: false,
          status: "done",
        },
        {
          id: "chk_pp_02",
          label: "Identifier risques",
          critical: false,
          status: "in_progress",
        },
        {
          id: "chk_pp_03",
          label: "Valider fenêtre de tir",
          critical: true,
          status: "todo",
        },
      ],
      missing_info: [],
      decisions: [],
      blockers: [],
      next_allowed: false,
    },
    {
      id: "budget",
      label: "Budget & financement",
      status: "todo",
      checklist: [
        {
          id: "chk_b_01",
          label: "Capacité d'achat réaliste",
          critical: true,
          status: "todo",
        },
        {
          id: "chk_b_02",
          label: "Coûts annexes",
          critical: true,
          status: "todo",
        },
        {
          id: "chk_b_03",
          label: "Scénarios co-investisseur / travaux",
          critical: false,
          status: "todo",
        },
      ],
      missing_info: [],
      decisions: [],
      blockers: [],
      next_allowed: false,
    },
    {
      id: "recherche",
      label: "Recherche & filtrage",
      status: "todo",
      checklist: [
        {
          id: "chk_r_01",
          label: "Critères must/nice/no-go",
          critical: true,
          status: "todo",
        },
        {
          id: "chk_r_02",
          label: "Consulter PV AG",
          critical: true,
          status: "todo",
          related_docs: ["pv_ag_derniere"],
        },
      ],
      missing_info: [
        {
          id: "miss_r_01",
          label: "PV dernière AG",
          doc_key: "pv_ag_derniere",
          ask_to: "syndic",
          reason: "Décisions/impayés",
          status: "absent",
        },
      ],
      decisions: [],
      blockers: [],
      next_allowed: false,
    },
    {
      id: "visites",
      label: "Visites & due diligence",
      status: "todo",
      checklist: [
        {
          id: "chk_v_01",
          label: "Contrôler humidité",
          critical: true,
          status: "todo",
        },
        {
          id: "chk_v_02",
          label: "Indices toiture",
          critical: true,
          status: "todo",
          related_docs: ["devis_toiture"],
        },
      ],
      missing_info: [],
      decisions: [],
      blockers: [],
      next_allowed: false,
    },
    {
      id: "offre",
      label: "Offre & négociation",
      status: "todo",
      checklist: [
        {
          id: "chk_o_01",
          label: "Évaluer valeur cible",
          critical: true,
          status: "todo",
        },
        {
          id: "chk_o_02",
          label: "Préparer clauses",
          critical: true,
          status: "todo",
        },
      ],
      missing_info: [],
      decisions: [],
      blockers: [],
      next_allowed: false,
    },
    {
      id: "compromis",
      label: "Promesse / Compromis",
      status: "todo",
      checklist: [
        {
          id: "chk_c_01",
          label: "Relire clauses sensibles",
          critical: true,
          status: "todo",
        },
      ],
      missing_info: [],
      decisions: [],
      blockers: [],
      next_allowed: false,
    },
    {
      id: "copro",
      label: "Copro / structure",
      status: "todo",
      checklist: [
        {
          id: "chk_cp_01",
          label: "Santé financière copro",
          critical: true,
          status: "todo",
        },
      ],
      missing_info: [],
      decisions: [],
      blockers: [],
      next_allowed: false,
    },
    {
      id: "notaire_banque",
      label: "Notaire / Banque / Agence",
      status: "todo",
      checklist: [
        {
          id: "chk_nb_01",
          label: "Pièces financement",
          critical: true,
          status: "todo",
        },
      ],
      missing_info: [],
      decisions: [],
      blockers: [],
      next_allowed: false,
    },
    {
      id: "travaux",
      label: "Travaux & arbitrages",
      status: "todo",
      checklist: [
        {
          id: "chk_t_01",
          label: "Faisabilité technique",
          critical: true,
          status: "todo",
        },
      ],
      missing_info: [
        {
          id: "miss_t_01",
          label: "Devis toiture",
          doc_key: "devis_toiture",
          ask_to: "syndic",
          reason: "Valider risque toiture",
          status: "absent",
        },
      ],
      decisions: [],
      blockers: [],
      next_allowed: false,
    },
    {
      id: "post_achat",
      label: "Post-achat",
      status: "todo",
      checklist: [
        {
          id: "chk_pa_01",
          label: "Planifier emménagement",
          critical: false,
          status: "todo",
        },
      ],
      missing_info: [],
      decisions: [],
      blockers: [],
      next_allowed: false,
    },
  ],
  ui: {
    last_open_step_id: "pre_projet",
    show_only_blockers: true,
  },
  offre: {
    property_info: null,
    market_analysis: null,
    scenarios: [
      { 
        id: "conservative", 
        nom: "Maximiser l'acceptation",
        strategie: "conservative",
        montant: null, 
        clauses: [], 
        delai_reponse: 72, 
        commentaire: "",
        probabilite_acceptation: 0,
        risque: "faible",
        plus_value_potentielle: "limitée",
        justification: ""
      },
      { 
        id: "balanced", 
        nom: "Équilibré",
        strategie: "balanced",
        montant: null, 
        clauses: [], 
        delai_reponse: 72, 
        commentaire: "",
        probabilite_acceptation: 0,
        risque: "modéré",
        plus_value_potentielle: "correcte",
        justification: ""
      },
      { 
        id: "aggressive", 
        nom: "Maximiser la plus-value",
        strategie: "aggressive",
        montant: null, 
        clauses: [], 
        delai_reponse: 72, 
        commentaire: "",
        probabilite_acceptation: 0,
        risque: "élevé",
        plus_value_potentielle: "importante",
        justification: ""
      }
    ],
    scenario_actif: "balanced",
    draft: "",
    offre_acceptee: false,
    market: { ref_price_m2: null, source: null },
    projection: { taux_annuel: 0.02, frais_revente: 0.07, valeur_future: null, gain_net: null }
  },
};
