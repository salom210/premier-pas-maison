import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { NonRetour } from "@/types/project";

interface NonRetourModalProps {
  open: boolean;
  onClose: () => void;
  nonRetour: NonRetour;
}

export function NonRetourModal({ open, onClose, nonRetour }: NonRetourModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-warning-foreground" />
            <DialogTitle>Point de non‑retour</DialogTitle>
          </div>
          <DialogDescription>{nonRetour.label}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">{nonRetour.explanation}</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>J'ai compris</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
