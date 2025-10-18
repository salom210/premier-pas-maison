import { ProjectData } from "@/types/project";

export const mockProjectData: ProjectData = {
  user: {
    id: "u_demo",
    stage: "recherche",
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
      { key: "pv_ag_derniere", label: "PV de la dernière AG" },
      { key: "releve_charges_12m", label: "Relevé de charges (12 mois)" },
      { key: "etat_sinistres_3ans", label: "Historique sinistres (3 ans)" },
      { key: "devis_toiture", label: "Devis toiture (si soupçon)" },
    ],
  },
  rules: {
    gating: [
      {
        when_step: "visites",
        requires: [{ type: "checklist_done", id: "chk_r_02" }],
        message_if_blocked:
          "Vous ne pouvez pas passer aux visites tant que le PV de la dernière AG n'a pas été consulté.",
      },
    ],
    non_retours: [
      {
        step: "offre",
        trigger: "offre_acceptee",
        label: "Offre acceptée",
        explanation:
          "Au-delà de ce point, les possibilités de retrait sont limitées aux clauses prévues.",
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
      id: "recherche",
      label: "Recherche & filtrage",
      status: "in_progress",
      checklist: [
        {
          id: "chk_r_01",
          label: "Définir vos critères must / nice / no-go",
          critical: true,
          status: "done",
        },
        {
          id: "chk_r_02",
          label: "Consulter le PV de la dernière AG",
          critical: true,
          status: "todo",
          related_docs: ["pv_ag_derniere"],
        },
      ],
      missing_info: [
        {
          id: "miss_r_01",
          label: "PV de la dernière AG",
          doc_key: "pv_ag_derniere",
          ask_to: "syndic",
          reason: "Identifier les travaux votés ou évoqués",
          status: "absent",
        },
      ],
      decisions: [],
      blockers: [
        {
          id: "blk_r_ag",
          label: "PV AG non consulté",
          severity: "high",
          explanation: "Le PV doit être lu avant de passer aux visites.",
        },
      ],
      next_allowed: false,
    },
    {
      id: "visites",
      label: "Visites & due diligence",
      status: "todo",
      checklist: [],
      missing_info: [],
      decisions: [],
      blockers: [],
      next_allowed: false,
    },
  ],
  ui: {
    last_open_step_id: "recherche",
    show_only_blockers: true,
  },
};
