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
  requires: Array<{ type: string; id: string }>;
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
  status: "done" | "todo";
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

export interface ProjectData {
  user: User;
  catalogs: Catalogs;
  rules: Rules;
  steps: Step[];
  ui: UIState;
}
