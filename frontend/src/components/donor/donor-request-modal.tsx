"use client";

import * as React from "react";
import { PublicDonorCard, UrgencyLevel, BloodGroup } from "@/types/database";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ALL_BLOOD_GROUPS, isDonorCompatible } from "@/lib/compatibility";
import { donorStore } from "@/lib/donor-store";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { isDonorOnCooldown, getCooldownDetails } from "@/lib/cooldown";
import { 
  SendHorizontal, 
  ShieldCheck, 
  MapPin, 
  AlertCircle, 
  Heart, 
  CheckCircle2, 
  Lock,
  Timer
} from "lucide-react";

export interface DonorRequestModalProps {
  donor: PublicDonorCard | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DonorRequestModal({
  donor,
  isOpen,
  onClose,
  onSuccess,
}: DonorRequestModalProps) {
  const [patientBloodGroup, setPatientBloodGroup] = React.useState<BloodGroup>("O+");
  const [hospitalName, setHospitalName] = React.useState("");
  const [urgencyLevel, setUrgencyLevel] = React.useState<UrgencyLevel>("urgent");
  const [contactName, setContactName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submittedData, setSubmittedData] = React.useState<{
    matchedCount: number;
    requestCity: string;
  } | null>(null);

  const nextEligible = donor?.next_eligible_donation_date || donor?.nextEligibleDonationDate;
  const lastDonation = donor?.last_donation_date || donor?.lastDonationDate;
  const onCooldown = isDonorOnCooldown(nextEligible) || 
    donor?.donation_eligibility_status === "On Cooldown" || 
    donor?.donationEligibilityStatus === "On Cooldown";
  const cooldown = onCooldown && nextEligible ? getCooldownDetails(lastDonation, nextEligible) : null;

  React.useEffect(() => {
    if (donor) {
      setPatientBloodGroup(donor.blood_group);
      setHospitalName("");
      setUrgencyLevel("urgent");
      setContactName("");
      setContactPhone("");
      setMessage("");
      setSubmittedData(null);
    }
  }, [donor]);

  if (!donor) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (onCooldown) {
      toast.error(`Donor is currently resting under a 4-month cooldown until ${cooldown?.exactDateFormatted || "eligible date"}.`);
      return;
    }

    if (!hospitalName.trim() || !contactName.trim() || !contactPhone.trim()) {
      toast.error("Please fill in hospital and contact details");
      return;
    }

    if (contactPhone.replace(/\D/g, "").length < 10) {
      toast.error("Please provide a valid 10-digit phone number");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = donorStore.createBloodRequest({
        patientBloodGroup,
        city: donor.city,
        locality: donor.locality,
        hospitalName: hospitalName.trim(),
        neededAt: new Date(Date.now() + 12 * 3600000).toISOString(),
        urgencyLevel,
        contactPersonName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        message: message.trim() || `Request for ${donor.display_name} and voluntary donors in ${donor.city}`,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      setSubmittedData({
        matchedCount: Math.max(1, result.matchedDonorsCount),
        requestCity: donor.city,
      });

      toast.success("Request sent to donor queue!");
      if (onSuccess) onSuccess();
    } catch {
      toast.error("Unable to send request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        submittedData ? (
          "Blood Request Dispatched"
        ) : (
          <div className="flex items-center gap-2">
            <span>Send Blood Request</span>
            <Badge variant="crimson" size="sm">
              {donor.blood_group}
            </Badge>
          </div>
        )
      }
      description={
        submittedData
          ? "Your voluntary request has been queued for verification and donor review."
          : `You are requesting assistance from voluntary donor ${donor.display_name} in ${donor.city}.`
      }
      size="md"
    >
      {submittedData ? (
        <div className="space-y-4 py-2">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              <p className="font-bold text-sm">Request Transmitted Successfully</p>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              We notified <strong>{submittedData.matchedCount} compatible donor(s)</strong> in{" "}
              {submittedData.requestCity}, including {donor.display_name}.
            </p>
          </div>

          <div className="rounded-xl bg-stone-50 border border-stone-200 p-3.5 text-xs text-stone-700 space-y-2">
            <div className="flex items-center gap-2 text-stone-900 font-semibold">
              <Lock className="h-4 w-4 text-stone-600" />
              <span>Next Steps & Privacy Protection</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              To protect donor privacy, voluntary donors review your facility and urgency details first. Once the donor explicitly accepts, you will receive a secure contact link.
            </p>
            <p className="text-amber-800 font-medium">
              Reminder: Never send money or advance fees. Voluntary blood donation in India is strictly free and non-commercial.
            </p>
          </div>

          <div className="pt-2">
            <Button variant="primary" onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cooldown Warning Notice if donor is on cooldown */}
          {onCooldown && cooldown ? (
            <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-300 p-3.5 text-xs text-amber-950 font-medium">
              <Timer className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-900">
                  Donor on 4-Month Cooldown ({cooldown.remainingText})
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  This donor completed a blood donation recently and is in their mandatory 4-month recovery cooldown period until <strong>{cooldown.exactDateFormatted}</strong>. Direct requests cannot be dispatched to donors while on cooldown.
                </p>
              </div>
            </div>
          ) : (
            /* Privacy Notice Pill */
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200/80 p-3 text-xs text-red-950 font-medium">
              <ShieldCheck className="h-4 w-4 text-red-700 shrink-0" />
              <span>
                Donor contact is protected. The donor must review and accept your request before contact details are shared.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              label="Patient Blood Group"
              value={patientBloodGroup}
              onChange={(e) => setPatientBloodGroup(e.target.value as BloodGroup)}
              required
            >
              {ALL_BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg} {bg === donor.blood_group ? "(Donor's exact group)" : ""}
                </option>
              ))}
            </Select>

            <Select
              label="Urgency Level"
              value={urgencyLevel}
              onChange={(e) => setUrgencyLevel(e.target.value as UrgencyLevel)}
              required
            >
              <option value="critical">🚨 Critical (Within 4-6 hours)</option>
              <option value="urgent">⚡ Urgent (Within 24 hours)</option>
              <option value="standard">📅 Standard (Scheduled)</option>
            </Select>
          </div>

          <Input
            label="Hospital / Medical Centre Name"
            placeholder="e.g. Fortis Hospital, Apollo, AIIMS"
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Contact Person Name"
              placeholder="e.g. Dr. Verma / S. Sharma"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
            />

            <Input
              label="Your Contact Phone (Protected)"
              placeholder="e.g. 9876543210"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              required
              helperText="Only shared once donor accepts"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Brief Note / Case Details (Optional)
            </label>
            <textarea
              className="flex w-full rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-800 focus-visible:border-red-800 min-h-[75px]"
              placeholder="e.g., Surgery scheduled tomorrow at 9 AM, whole blood or platelets required."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {onCooldown ? (
              <Button
                type="button"
                variant="outline"
                disabled
                className="gap-2 opacity-60 cursor-not-allowed bg-stone-100 text-stone-500 border-stone-200"
              >
                <Lock className="h-4 w-4 text-stone-400" />
                Donor on Cooldown (Unavailable)
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="gap-2"
              >
                <SendHorizontal className="h-4 w-4" />
                Broadcast Request
              </Button>
            )}
          </div>
        </form>
      )}
    </Modal>
  );
}
