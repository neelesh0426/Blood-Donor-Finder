"use client";

import * as React from "react";
import { DonationRecord, DonationType } from "@/types/database";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileEdit, CheckCircle2, ShieldAlert, Calendar, Building2 } from "lucide-react";
import { toast } from "sonner";
import { donorStore } from "@/lib/donor-store";

export interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  donorId: string;
  selectedDonation: DonationRecord | null;
  onSuccess: () => void;
}

export function CorrectionModal({
  isOpen,
  onClose,
  donorId,
  selectedDonation,
  onSuccess,
}: CorrectionModalProps) {
  const [requestType, setRequestType] = React.useState<"UPDATE_DATE" | "ADD_RECORD" | "INCORRECT_TYPE" | "OTHER">("UPDATE_DATE");
  const [proposedDate, setProposedDate] = React.useState("");
  const [proposedType, setProposedType] = React.useState<DonationType>("whole_blood");
  const [facilityName, setFacilityName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (selectedDonation) {
      const d = selectedDonation.donation_date || selectedDonation.donationDate;
      setProposedDate(d ? d.split("T")[0] : "");
      setProposedType((selectedDonation.donation_type || selectedDonation.donationType || "whole_blood") as DonationType);
      setFacilityName(selectedDonation.facility_name || selectedDonation.facilityName || "");
      setRequestType("UPDATE_DATE");
    } else {
      setProposedDate("");
      setProposedType("whole_blood");
      setFacilityName("");
      setRequestType("ADD_RECORD");
    }
    setDescription("");
  }, [selectedDonation, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || description.trim().length < 5) {
      toast.error("Please provide a reason or note (minimum 5 characters) for the administration review.");
      return;
    }

    setIsSubmitting(true);
    try {
      await donorStore.submitCorrectionRequest(donorId, {
        donationId: selectedDonation?.id || undefined,
        requestType,
        description: description.trim(),
        proposedDate: proposedDate ? new Date(proposedDate).toISOString() : undefined,
        proposedType,
        facilityName: facilityName.trim() || undefined,
      });

      toast.success("Correction request submitted for administrative review.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit correction request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Donation Record Correction"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Medical Policy Notice */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-1 text-stone-700">
          <div className="flex items-center gap-1.5 font-bold text-stone-900">
            <ShieldAlert className="h-4 w-4 text-amber-700" />
            <span>Integrity & Verification Safeguard</span>
          </div>
          <p className="text-[11px] leading-relaxed text-stone-600">
            To preserve clinical safety and prevent premature cooldown bypasses, donors cannot directly modify verified records. All correction requests are reviewed by authorized blood-bank staff.
          </p>
        </div>

        {selectedDonation && (
          <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-1">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Target Record to Correct
            </span>
            <div className="font-bold text-stone-900 flex items-center justify-between">
              <span>{selectedDonation.facility_name || selectedDonation.facilityName || "Blood Centre"}</span>
              <Badge variant="crimson" size="sm">
                {(selectedDonation.donation_type || selectedDonation.donationType || "whole_blood").replace("_", " ").toUpperCase()}
              </Badge>
            </div>
            <div className="text-[11px] text-stone-500">
              Current Date: {new Date(selectedDonation.donation_date || selectedDonation.donationDate || "").toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
            Correction Nature
          </label>
          <Select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as any)}
          >
            <option value="UPDATE_DATE">Corrected Donation Date</option>
            <option value="INCORRECT_TYPE">Incorrect Donation Component (e.g. Platelets vs Whole Blood)</option>
            <option value="ADD_RECORD">Missing Historical Verified Donation</option>
            <option value="OTHER">Other Discrepancy / Hospital Name Correction</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Proposed Donation Date
            </label>
            <Input
              type="date"
              value={proposedDate}
              onChange={(e) => setProposedDate(e.target.value)}
              icon={Calendar}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
              Donation Type
            </label>
            <Select
              value={proposedType}
              onChange={(e) => setProposedType(e.target.value as DonationType)}
            >
              <option value="whole_blood">Whole Blood (4-Month Cooldown)</option>
              <option value="platelets">Platelet Apheresis (14-Day Cooldown)</option>
              <option value="plasma">Plasma Apheresis (28-Day Cooldown)</option>
              <option value="double_red_cells">Double Red Cells (16-Week Cooldown)</option>
            </Select>
          </div>
        </div>

        <Input
          label="Blood Bank / Hospital Facility Name"
          placeholder="e.g. King George Hospital Blood Centre, Vizag"
          value={facilityName}
          onChange={(e) => setFacilityName(e.target.value)}
          icon={Building2}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
            Reason & Supporting Clinical Details *
          </label>
          <textarea
            rows={3}
            placeholder="Please detail why this correction is needed (e.g. certificate reference, error in month entry)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white p-3 text-xs text-stone-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-800"
            required
          />
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
            <FileEdit className="h-3.5 w-3.5" />
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
