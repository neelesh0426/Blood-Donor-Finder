import * as React from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SafetyDisclaimerBannerProps {
  className?: string;
  compact?: boolean;
}

export const SAFETY_DISCLAIMER_TEXT =
  "This platform is for informational purposes only. Donor availability, medical eligibility, blood compatibility, and hospital requirements must be verified directly by the donor, recipient, and qualified healthcare professionals before any donation or transfusion.";

export function SafetyDisclaimerBanner({
  className,
  compact = false,
}: SafetyDisclaimerBannerProps) {
  if (compact) {
    return (
      <div
        role="note"
        aria-label="Clinical safety disclaimer"
        className={cn(
          "flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-900",
          className
        )}
      >
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
        <p>
          <strong className="font-semibold text-amber-950">Important Notice: </strong>
          {SAFETY_DISCLAIMER_TEXT}
        </p>
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label="Informational safety notice"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-rose-200/70 bg-gradient-to-r from-rose-50/90 via-amber-50/60 to-rose-50/80 p-4 sm:p-5 text-stone-800 shadow-xs",
        className
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-800">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-bold tracking-tight text-red-950 uppercase">
            Clinical Safety & Informational Notice
          </h4>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
            {SAFETY_DISCLAIMER_TEXT}
          </p>
        </div>
      </div>
    </div>
  );
}
