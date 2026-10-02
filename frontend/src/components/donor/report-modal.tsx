"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import { ReportReason, ReportTargetType } from "@/types/database";

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetName?: string;
  reporterId?: string | null;
  reporterName?: string;
}

export function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  reporterId,
  reporterName,
}: ReportModalProps) {
  const [reason, setReason] = React.useState<ReportReason>("commercial_blood_sale");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      toast.error("Please provide at least 10 characters detailing what occurred.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId: reporterId || null,
          reporterName: reporterName || "Anonymous",
          targetType,
          targetId,
          targetName,
          reason,
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit report");

      toast.success("Report filed securely. Our trust and safety team will investigate immediately.");
      setDescription("");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="File Trust & Safety Report"
      description={`Report suspicious activity, scam attempt, or rule violation regarding ${targetName || targetId}.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
        {/* Anti-Scam Statutory Warning */}
        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-red-950 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-red-900">
            <ShieldAlert className="h-4 w-4 text-red-700 shrink-0" />
            Zero Tolerance for Commercial Blood Trading
          </p>
          <p className="text-[11px] leading-relaxed text-red-800">
            BloodLink strictly bans any solicitation of money, advance payments, transport fees, or blood selling. In India, selling blood is punishable under the Drugs and Cosmetics Act.
          </p>
        </div>

        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
            Reason for Report *
          </label>
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value as ReportReason)}
          >
            <option value="commercial_blood_sale">Demanding money or payment for blood donation</option>
            <option value="advance_payment_demand">Demanding advance payment or transfer fee</option>
            <option value="fake_donor_or_patient">Fake profile or fictitious patient request</option>
            <option value="harassment">Inappropriate messaging or harassment</option>
            <option value="outdated_info">Inaccurate or false blood group / contact details</option>
            <option value="other">Other safety or policy concern</option>
          </Select>
        </div>

        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
            Incident Description & Supporting Details *
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please detail what occurred (e.g. user demanded payment over WhatsApp, profile information is fake)..."
            className="w-full rounded-xl border border-stone-300 p-3 text-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-800"
            required
          />
          <span className="text-[10px] text-stone-500">Minimum 10 characters. Reports are reviewed by administrators.</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            isLoading={isSubmitting}
            disabled={description.trim().length < 10 || isSubmitting}
          >
            Submit Confidential Report
          </Button>
        </div>
      </form>
    </Modal>
  );
}
