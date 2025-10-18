import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FiabiliteCritereProps {
  icon: LucideIcon;
  label: string;
  score: number;
  detail: string;
  warning?: boolean;
}

export function FiabiliteCritere({ 
  icon: Icon, 
  label, 
  score, 
  detail, 
  warning 
}: FiabiliteCritereProps) {
  const maxScore = label.includes('Fraîcheur') ? 30 : 
                   label.includes('Complétude') ? 25 :
                   label.includes('Confiance') ? 25 : 20;
  
  const percentage = (score / maxScore) * 100;
  
  return (
    <div className="flex items-start gap-3 p-2 rounded-md hover:bg-accent/5 transition-colors">
      <Icon className={cn(
        "h-4 w-4 mt-0.5 shrink-0",
        warning ? "text-warning" : "text-muted-foreground"
      )} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className={cn(
            "text-xs font-semibold",
            percentage >= 80 ? "text-success" :
            percentage >= 50 ? "text-warning" :
            "text-destructive"
          )}>
            {score}/{maxScore}
          </span>
        </div>
        <p className={cn(
          "text-xs",
          warning ? "text-warning-foreground" : "text-muted-foreground"
        )}>
          {detail}
        </p>
      </div>
    </div>
  );
}
