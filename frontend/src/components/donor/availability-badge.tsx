"use client";

import * as React from "react";
import { AvailabilityStatus, DonationEligibilityStatus } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Calendar, ShieldAlert, Sparkles, Timer, AlertCircle } from "lucide-react";
import { getCooldownDetails, isDonorOnCooldown } from "@/lib/cooldown";

export interface AvailabilityBadgeProps {
  status?: AvailabilityStatus;
  unavailableUntil?: string | null;
  eligibilityStatus?: DonationEligibilityStatus | null;
  lastDonationDate?: string | null;
  nextEligibleDate?: string | null;
  size?: "sm" | "md" | "lg";
  showCooldownDetails?: boolean;
  className?: string;
}

export function AvailabilityBadge({
  status = "available_now",
  unavailableUntil,
  eligibilityStatus,
  lastDonationDate,
  nextEligibleDate,
  size = "md",
  showCooldownDetails = true,
  className = "",
}: AvailabilityBadgeProps) {
  // Client-side dynamic tick every minute to keep countdown completely fresh
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!nextEligibleDate) return;
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, [nextEligibleDate]);

  // Check requires review first
  const isRequiresReview = eligibilityStatus === "REQUIRES_REVIEW";

  if (isRequiresReview) {
    return (
      <div className={`inline-flex flex-col items-start sm:items-end gap-1 ${className}`}>
        <Badge
          variant="warning"
          size={size}
          className="gap-1.5 font-bold bg-amber-50 text-amber-900 border-amber-300 shadow-2xs"
        >
          <AlertCircle className="h-3 w-3 text-amber-700 shrink-0" />
          <span>Requires Review</span>
        </Badge>
        {showCooldownDetails && (
          <span className="text-[11px] font-medium text-amber-800 flex items-center gap-1 leading-tight text-right">
            <span>Eligibility review required</span>
          </span>
        )}
      </div>
    );
  }

  // Check cooldown status
  const onCooldown = isDonorOnCooldown(nextEligibleDate) || eligibilityStatus === "ON_COOLDOWN" || eligibilityStatus === "On Cooldown";

  if (onCooldown && nextEligibleDate) {
    const cooldown = getCooldownDetails(lastDonationDate, nextEligibleDate);

    return (
      <div className={`inline-flex flex-col items-start sm:items-end gap-1 ${className}`}>
        <Badge
          variant="warning"
          size={size}
          className="gap-1.5 font-bold bg-amber-50 text-amber-900 border-amber-300 shadow-2xs text-left sm:text-right"
        >
          <Timer className="h-3 w-3 text-amber-700 shrink-0" />
          <span>On cooldown — likely eligible again on {cooldown.exactDateFormatted}</span>
        </Badge>
        {showCooldownDetails && (
          <span className="text-[11px] font-semibold text-amber-800 flex items-center gap-1 leading-tight">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>{cooldown.remainingText}</span>
          </span>
        )}
      </div>
    );
  }

  // If status is temporarily unavailable
  if (status === "temporarily_unavailable") {
    return (
      <Badge variant="warning" size={size} className={`gap-1 ${className}`}>
        <Clock className="h-3 w-3" />
        Temporarily Unavailable
      </Badge>
    );
  }

  // If resting until a date
  if (status === "unavailable_until" && unavailableUntil) {
    return (
      <Badge variant="neutral" size={size} className={`gap-1 ${className}`}>
        <Calendar className="h-3 w-3" />
        Resting until {new Date(unavailableUntil).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
      </Badge>
    );
  }

  // Standard Eligible & Available to donate
  return (
    <div className={`inline-flex flex-col items-start sm:items-end gap-0.5 ${className}`}>
      <Badge
        variant="success"
        size={size}
        className="gap-1.5 font-bold bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs"
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
        </span>
        <span>Likely eligible to donate.</span>
      </Badge>
      {showCooldownDetails && (
        <span className="text-[10px] text-emerald-700 font-medium">Available now</span>
      )}
    </div>
  );
}

/**
 * Dedicated standalone Cooldown Pill / Badge
 */
export function CooldownBadge({
  lastDonationDate,
  nextEligibleDate,
  size = "md",
  showRemaining = true,
}: {
  lastDonationDate?: string | null;
  nextEligibleDate?: string | null;
  size?: "sm" | "md";
  showRemaining?: boolean;
}) {
  const onCooldown = isDonorOnCooldown(nextEligibleDate);
  const cooldown = getCooldownDetails(lastDonationDate, nextEligibleDate);

  if (!onCooldown) {
    return (
      <Badge variant="success" size={size} className="gap-1 font-semibold">
        <CheckCircle2 className="h-3 w-3 text-emerald-700" />
        Likely eligible to donate.
      </Badge>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <Badge variant="warning" size={size} className="gap-1 font-bold bg-amber-50 text-amber-900 border-amber-300">
        <Timer className="h-3 w-3 text-amber-700" />
        On cooldown — likely eligible again on {cooldown.exactDateFormatted}
      </Badge>
      {showRemaining && (
        <span className="text-xs text-amber-800 font-medium">
          {cooldown.remainingText}
        </span>
      )}
    </div>
  );
}
