"use client";

import * as React from "react";
import { PublicDonorCard } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AvailabilityBadge } from "./availability-badge";
import { formatDate } from "@/lib/utils";
import { isDonorOnCooldown, getCooldownDetails, CLINICAL_SAFETY_DISCLAIMER } from "@/lib/cooldown";
import { 
  MapPin, 
  ShieldCheck, 
  Droplet, 
  Clock, 
  Lock, 
  SendHorizontal, 
  CheckCircle, 
  Sparkles,
  Building2,
  Timer,
  CalendarCheck,
  Bell,
  AlertCircle,
  Flag,
  Award
} from "lucide-react";
import { computeCurrentVerificationStatus, getVerificationDisplay } from "@/lib/verification/donor-verification";

export interface DonorCardProps {
  donor: PublicDonorCard;
  onRequestClick: (donor: PublicDonorCard) => void;
  onNotifyClick?: (donor: PublicDonorCard) => void;
  onReportClick?: (donor: PublicDonorCard) => void;
}

export function DonorCard({ donor, onRequestClick, onNotifyClick, onReportClick }: DonorCardProps) {
  const nextEligible = donor.next_eligible_donation_date || donor.nextEligibleDonationDate;
  const lastDonation = donor.last_donation_date || donor.lastDonationDate;
  const isRequiresReview = 
    donor.donation_eligibility_status === "REQUIRES_REVIEW" || 
    donor.donationEligibilityStatus === "REQUIRES_REVIEW" || 
    donor.eligibilityStatus === "REQUIRES_REVIEW";

  const onCooldown = !isRequiresReview && (
    isDonorOnCooldown(nextEligible) || 
    donor.donation_eligibility_status === "ON_COOLDOWN" || 
    donor.donation_eligibility_status === "On Cooldown" || 
    donor.donationEligibilityStatus === "ON_COOLDOWN" ||
    donor.donationEligibilityStatus === "On Cooldown" ||
    donor.eligibilityStatus === "ON_COOLDOWN"
  );

  const cooldown = onCooldown && nextEligible ? getCooldownDetails(lastDonation, nextEligible) : null;

  return (
    <Card className={`transition-all duration-200 flex flex-col justify-between overflow-hidden group border ${
      onCooldown 
        ? "border-amber-200/90 bg-stone-50/40 hover:border-amber-300" 
        : isRequiresReview
        ? "border-amber-200 bg-amber-50/20 hover:border-amber-300"
        : "border-stone-200 hover:border-red-300 hover:shadow-md"
    }`}>
      <CardContent className="p-4 sm:p-5 space-y-3.5">
        {/* Top bar: Blood group + Availability & Cooldown Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* Blood group emblem */}
            <div className={`flex h-12 w-12 sm:h-13 sm:w-13 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm font-black text-lg sm:text-xl tracking-tight ${
              onCooldown
                ? "bg-gradient-to-br from-stone-600 to-stone-800 opacity-90"
                : isRequiresReview
                ? "bg-gradient-to-br from-amber-700 to-stone-800"
                : "bg-gradient-to-br from-red-800 to-red-950 shadow-red-900/20"
            }`}>
              {donor.blood_group}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-stone-900 text-base sm:text-lg leading-snug">
                  {donor.display_name}
                </h3>
                {donor.is_demo && (
                  <Badge variant="demo" size="sm">
                    Demo
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                <span className="truncate">
                  {donor.city}{donor.state ? `, ${donor.state}` : ""}{donor.locality ? ` • ${donor.locality}` : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <AvailabilityBadge
              status={donor.availability_status}
              unavailableUntil={donor.unavailable_until}
              eligibilityStatus={donor.eligibilityStatus || donor.donation_eligibility_status || donor.donationEligibilityStatus}
              lastDonationDate={lastDonation}
              nextEligibleDate={nextEligible}
              size="sm"
            />
          </div>
        </div>

        {/* Cooldown Explanatory Banner for donors currently on medical recovery */}
        {onCooldown && cooldown && (
          <div className="rounded-xl bg-amber-50/90 border border-amber-200/90 p-2.5 text-xs text-amber-950 flex items-start gap-2">
            <Timer className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 flex-wrap font-bold text-amber-900">
                <span>On cooldown — likely eligible again on {cooldown.exactDateFormatted}</span>
                <span className="text-[11px] text-amber-800 font-semibold">{cooldown.remainingText}</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-snug">
                {lastDonation ? `Donated on ${formatDate(lastDonation)}. ` : ""}
                Standard voluntary donation recovery period in progress.
              </p>
            </div>
          </div>
        )}

        {/* Pending Review Banner */}
        {isRequiresReview && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-950 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1 min-w-0">
              <span className="font-bold text-amber-900">Eligibility Review Required</span>
              <p className="text-[11px] text-amber-800">
                This donor has a pending eligibility correction or administrative review.
              </p>
            </div>
          </div>
        )}

        {/* Nearest Hospital / Blood Bank Centre if available */}
        {donor.nearest_hospital && (
          <div className="flex items-center gap-1.5 text-[11px] text-stone-700 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200/70">
            <Building2 className="h-3.5 w-3.5 text-red-800 shrink-0" />
            <span className="truncate font-medium">Nearest Centre: {donor.nearest_hospital}</span>
          </div>
        )}

        {/* Verification & Privacy Trust Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {(() => {
            const clinicalVer = computeCurrentVerificationStatus({
              donorVerificationStatus: donor.donor_verification_status || donor.donorVerificationStatus,
              verificationExpiresAt: donor.verification_expires_at || donor.verificationExpiresAt,
            });
            if (clinicalVer.isCurrentlyVerified) {
              return (
                <Badge variant="success" size="sm" className="bg-emerald-100/90 text-emerald-900 border-emerald-300 font-bold gap-1 shadow-xs">
                  <Award className="h-3 w-3 text-emerald-700" />
                  Clinically Verified
                </Badge>
              );
            }
            return null;
          })()}

          {donor.phone_verified && (
            <Badge variant="success" size="sm" className="bg-emerald-50 text-emerald-800 border-emerald-200">
              <CheckCircle className="h-3 w-3" />
              Phone Verified
            </Badge>
          )}

          {donor.email_verified && (
            <Badge variant="success" size="sm" className="bg-sky-50 text-sky-800 border-sky-200">
              <ShieldCheck className="h-3 w-3" />
              Email Verified
            </Badge>
          )}

          <Badge variant="neutral" size="sm" className="text-stone-500 border-stone-200 gap-1">
            <Lock className="h-3 w-3 text-stone-400" />
            Contact Protected
          </Badge>
        </div>

        {/* Explicit Clinical Safety Reminder */}
        <div className="text-[10px] text-stone-400 leading-tight italic">
          * {CLINICAL_SAFETY_DISCLAIMER}
        </div>

        {/* Footer meta info: updated timestamp & send request or notify CTA */}
        <div className="border-t border-stone-100 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-stone-500">
              <Clock className="h-3.5 w-3.5 text-stone-400 shrink-0" />
              <span>Active: {formatDate(donor.last_active_at)}</span>
            </div>
            {onReportClick && (
              <button
                type="button"
                onClick={() => onReportClick(donor)}
                className="text-stone-400 hover:text-red-700 p-1 rounded-md transition-colors cursor-pointer"
                title="Report suspicious behavior or commercial payment request"
                aria-label={`Report ${donor.display_name}`}
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Action button: If on cooldown, DO NOT show request button; show Notify me when eligible */}
          {onCooldown ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNotifyClick && onNotifyClick(donor)}
              className="w-full sm:w-auto h-9 px-3.5 font-bold text-xs gap-1.5 border-amber-300 text-amber-900 bg-amber-50/70 hover:bg-amber-100 transition-colors"
              title="Get an automated alert when this donor completes their cooldown period"
            >
              <Bell className="h-3.5 w-3.5 text-amber-700" />
              Notify me when eligible
            </Button>
          ) : isRequiresReview ? (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="w-full sm:w-auto h-9 px-3 font-semibold text-xs gap-1.5 opacity-75 cursor-not-allowed bg-stone-100 text-stone-500 border-stone-200"
            >
              <Lock className="h-3.5 w-3.5 text-stone-400" />
              Under Review
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onRequestClick(donor)}
              className="w-full sm:w-auto h-9 px-3.5 font-semibold text-xs gap-1.5 shadow-xs"
            >
              <SendHorizontal className="h-3.5 w-3.5" />
              Send Request
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
