import { XCircle } from "lucide-react";
import { Blocker } from "@/types/project";

interface BlockersListProps {
  blockers: Blocker[];
}

export function BlockersList({ blockers }: BlockersListProps) {
  if (blockers.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <XCircle className="h-4 w-4 text-destructive" />
        <h3 className="text-sm font-medium text-foreground">Éléments bloquants</h3>
      </div>
      {blockers.map((blocker) => (
        <div
          key={blocker.id}
          className="p-4 rounded-lg border border-destructive/20 bg-destructive/5"
        >
          <p className="text-sm font-medium text-foreground mb-1">
            {blocker.label}
          </p>
          <p className="text-xs text-muted-foreground">{blocker.explanation}</p>
        </div>
      ))}
    </div>
  );
}
