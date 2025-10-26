import * as React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OfferStep {
  id: string;
  label: string;
  completed: boolean;
  disabled: boolean;
}

export interface OfferStepperProps {
  steps: OfferStep[];
  currentStep: string;
  onStepClick: (stepId: string) => void;
  className?: string;
}

export function OfferStepper({ 
  steps, 
  currentStep, 
  onStepClick, 
  className 
}: OfferStepperProps) {
  // Éviter le rendu si les steps ne sont pas prêts
  if (!steps || steps.length === 0) {
    return null;
  }


  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.completed;
          const isDisabled = step.disabled;
          const isClickable = isCompleted || isActive;
          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => isClickable && !isDisabled && onStepClick(step.id)}
                  disabled={!isClickable || isDisabled}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 focus:outline-none",
                    // Priorité des états : disabled > active > completed > default
                    isDisabled && "bg-muted border-muted-foreground/30 text-muted-foreground cursor-not-allowed",
                    !isDisabled && isActive && "bg-primary border-primary text-primary-foreground ring-2 ring-primary/20 shadow-lg",
                    !isDisabled && !isActive && isCompleted && "bg-white border-gray-300 text-gray-600",
                    !isDisabled && !isActive && !isCompleted && "bg-background border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    isClickable && !isDisabled && "cursor-pointer"
                  )}
                  style={!isDisabled && isActive ? {
                    backgroundColor: 'hsl(var(--primary))',
                    borderColor: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                    boxShadow: '0 0 0 2px hsl(var(--primary) / 0.2)',
                    outline: 'none'
                  } : undefined}
                  aria-label={`Étape ${index + 1}: ${step.label}`}
                  aria-current={isActive ? "step" : undefined}
                  aria-disabled={isDisabled}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Circle className={cn("h-5 w-5", {
                      "fill-current": isActive && !isCompleted,
                      "stroke-current": !isActive || isCompleted
                    })} />
                  )}
                </button>
                
                {/* Step label */}
                <span className={cn(
                  "mt-2 text-xs font-medium text-center max-w-20",
                  {
                    "text-foreground": isActive || isCompleted,
                    "text-muted-foreground": !isActive && !isCompleted,
                  }
                )}>
                  {step.label}
                </span>
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2 transition-colors duration-200",
                  {
                    "bg-gray-300": isCompleted,
                    "bg-border": !isCompleted,
                  }
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
