"use client";

import * as React from "react";
import { PublicDonorCard } from "@/types/database";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Phone, Calendar, Heart, ShieldCheck, CheckCircle2 } from "lucide-react";
import { getCooldownDetails } from "@/lib/cooldown";
import { toast } from "sonner";
import { donorStore } from "@/lib/donor-store";

export interface NotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  donor: PublicDonorCard | null;
}

export function NotifyModal({ isOpen, onClose, donor }: NotifyModalProps) {
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setEmail("");
      setPhone("");
    }
  }, [isOpen]);

  if (!donor) return null;

  const cooldown = getCooldownDetails(donor.last_donation_date, donor.next_eligible_donation_date);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      toast.error("Please enter at least an email address or mobile number");
      return;
    }

    setIsSubmitting(true);
    try {
      await donorStore.registerEligibilityNotification(donor.id, {
        requesterEmail: email || undefined,
        requesterPhone: phone || undefined,
        patientBloodGroup: donor.blood_group,
      });

      setIsSuccess(true);
      toast.success("Notification request confirmed! We will alert you when this donor is eligible.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to register notification request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notify Me When Eligible"
      size="md"
    >
      {isSuccess ? (
        <div className="py-6 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-stone-900">Notification Alert Registered</h3>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              We have scheduled an automated notification for <strong>{donor.display_name} ({donor.blood_group})</strong> on{" "}
              <strong>{cooldown.exactDateFormatted}</strong>.
            </p>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 text-left space-y-1">
            <div className="font-semibold text-stone-800">What happens next?</div>
            <p className="text-[11px] text-stone-500">
              When {donor.display_name}&apos;s medical cooldown completes, an instant reminder will be dispatched to your contact channel so you can connect if blood is still required.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Donor Summary Header */}
          <div className="rounded-xl bg-amber-50/80 border border-amber-200/90 p-3.5 space-y-2 text-amber-950">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white font-bold text-xs">
                  {donor.blood_group}
                </span>
                <span className="font-bold text-stone-900 text-sm">{donor.display_name}</span>
              </div>
              <Badge variant="warning" size="sm">
                On Cooldown
              </Badge>
            </div>
            <div className="text-[11px] text-amber-900 leading-relaxed">
              Likely eligible again on <strong>{cooldown.exactDateFormatted}</strong> ({cooldown.remainingText}).
            </div>
          </div>

          <p className="text-stone-600 leading-relaxed text-[11px]">
            Direct contact requests are disabled to respect voluntary donor health and recovery intervals. Leave your contact details below to be notified as soon as this donor is likely eligible to donate again.
          </p>

          <div className="space-y-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. attender@hospital.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
            />

            <Input
              label="Mobile Phone / WhatsApp Number"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={Phone}
            />
          </div>

          {/* Clinical Disclaimer */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5 text-[11px] text-stone-600 flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-red-800 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>Medical Notice:</strong> Final donation eligibility must be confirmed by qualified blood-bank or medical staff.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="gap-1.5 font-bold shadow-sm"
            >
              <Bell className="h-3.5 w-3.5" />
              Notify Me When Eligible
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
