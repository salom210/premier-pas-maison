import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StepNavigationFooterProps {
  title: string;
  description: string;
  buttonLabel: string;
  onNext: () => void;
  disabled: boolean;
  disabledReason?: string;
  isLoading?: boolean;
  className?: string;
  secondaryButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    isLoading?: boolean;
    icon?: React.ReactNode;
  };
}

export function StepNavigationFooter({
  title,
  description,
  buttonLabel,
  onNext,
  disabled,
  disabledReason,
  isLoading = false,
  className,
  secondaryButton
}: StepNavigationFooterProps) {
  return (
    <Card className={cn("border-t border-border bg-card", className)}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">
              {disabled && disabledReason ? disabledReason : description}
            </p>
          </div>
          <div className="ml-4 flex gap-2">
            {secondaryButton && (
              <Button 
                variant="outline"
                onClick={secondaryButton.onClick}
                disabled={secondaryButton.disabled || secondaryButton.isLoading}
              >
                {secondaryButton.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    En cours...
                  </>
                ) : (
                  <>
                    {secondaryButton.icon && <span className="mr-2">{secondaryButton.icon}</span>}
                    {secondaryButton.label}
                  </>
                )}
              </Button>
            )}
            <Button 
              onClick={onNext}
              disabled={disabled || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  En cours...
                </>
              ) : (
                <>
                  {buttonLabel}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
