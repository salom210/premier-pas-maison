import { CheckCircle2, Circle } from "lucide-react";
import { ChecklistItem } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface StepChecklistProps {
  items: ChecklistItem[];
  onToggle?: (id: string) => void;
}

export function StepChecklist({ items, onToggle }: StepChecklistProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground mb-3">Checklist</h3>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/50"
        >
          <button
            onClick={() => onToggle?.(item.id)}
            className="shrink-0 mt-0.5"
          >
            {item.status === "done" ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-sm ${
                  item.status === "done"
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                {item.label}
              </span>
              {item.critical && item.status === "todo" && (
                <Badge variant="outline" className="text-xs bg-warning/10 border-warning/30">
                  Critique
                </Badge>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
