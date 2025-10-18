import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { MissingInfo } from "@/types/project";

interface MissingInfoModalProps {
  open: boolean;
  onClose: () => void;
  missingItems: MissingInfo[];
  catalogs: { actors: Array<{ id: string; label: string }> };
  onMarkReceived: (id: string) => void;
}

export function MissingInfoModal({
  open,
  onClose,
  missingItems,
  catalogs,
  onMarkReceived,
}: MissingInfoModalProps) {
  const getActorLabel = (actorId: string) => {
    const actor = catalogs.actors.find((a) => a.id === actorId);
    return actor?.label || actorId;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Informations manquantes</DialogTitle>
          <DialogDescription>
            Ces documents sont nécessaires pour avancer sereinement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {missingItems.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg border border-warning/30 bg-warning/5"
            >
              <div className="flex items-start gap-3 mb-3">
                <FileText className="h-5 w-5 text-warning-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-foreground mb-1">{item.label}</p>
                  <p className="text-sm text-muted-foreground mb-2">{item.reason}</p>
                  <Badge variant="secondary" className="text-xs">
                    À demander au {getActorLabel(item.ask_to)}
                  </Badge>
                </div>
              </div>
              {item.status === "absent" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onMarkReceived(item.id)}
                  className="w-full"
                >
                  Marquer comme reçu
                </Button>
              )}
              {item.status === "present" && (
                <Badge variant="default" className="w-full justify-center">
                  Document reçu
                </Badge>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
