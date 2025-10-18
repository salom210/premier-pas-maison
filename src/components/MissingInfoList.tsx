import { AlertTriangle } from "lucide-react";
import { MissingInfo } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MissingInfoListProps {
  items: MissingInfo[];
  catalogs: { actors: Array<{ id: string; label: string }> };
}

export function MissingInfoList({ items, catalogs }: MissingInfoListProps) {
  if (items.length === 0) return null;

  const getActorLabel = (actorId: string) => {
    const actor = catalogs.actors.find((a) => a.id === actorId);
    return actor?.label || actorId;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-warning-foreground" />
        <h3 className="text-sm font-medium text-foreground">
          Informations à sécuriser
        </h3>
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className="p-4 rounded-lg border border-warning/30 bg-warning/5"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground mb-1">
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                {item.reason}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              À demander au {getActorLabel(item.ask_to)}
            </Badge>
            <Button size="sm" variant="outline" className="ml-auto text-xs">
              Demander ce document
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
