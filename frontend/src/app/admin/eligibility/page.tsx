"use client";

import * as React from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Settings, 
  FileText, 
  History, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  PlusCircle, 
  UserCheck, 
  Sliders, 
  Calendar, 
  Droplet, 
  Building2, 
  Clock, 
  Lock, 
  FileEdit,
  User,
  ArrowRight,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { SafetyDisclaimerBanner } from "@/components/layout/safety-disclaimer-banner";
import { CLINICAL_SAFETY_DISCLAIMER, getCooldownDetails } from "@/lib/cooldown";
import { formatDate } from "@/lib/utils";
import { 
  CooldownPolicy, 
  DonationType, 
  DonationCorrectionRequest, 
  AuditLogRecord, 
  PublicDonorCard, 
  DonationRecord 
} from "@/types/database";
import { toast } from "sonner";

export default function AdminEligibilityPage() {
  // Active Tab
  const [activeTab, setActiveTab] = React.useState<"donations" | "policies" | "corrections" | "audit">("donations");

  // Simulated Admin Session / Authorization
  const [currentUserRole, setCurrentUserRole] = React.useState<"admin" | "staff" | "unauthorized">("admin");
  const [staffName, setStaffName] = React.useState("Dr. K. Rao (Chief Medical Officer)");

  // State
  const [donors, setDonors] = React.useState<PublicDonorCard[]>([]);
  const [policies, setPolicies] = React.useState<CooldownPolicy[]>([]);
  const [corrections, setCorrections] = React.useState<DonationCorrectionRequest[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // New Verified Donation Form State
  const [selectedDonorId, setSelectedDonorId] = React.useState("");
  const [donationType, setDonationType] = React.useState<DonationType>("whole_blood");
  const [donationDate, setDonationDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [facilityName, setFacilityName] = React.useState("Government General Blood Centre");
  const [unitsDonated, setUnitsDonated] = React.useState("1");
  const [staffNotes, setStaffNotes] = React.useState("");
  const [isOverride, setIsOverride] = React.useState(false);
  const [overrideReason, setOverrideReason] = React.useState("");
  const [isSubmittingDonation, setIsSubmittingDonation] = React.useState(false);

  // Edit Policy Modal State
  const [editingPolicy, setEditingPolicy] = React.useState<CooldownPolicy | null>(null);
  const [policyMonths, setPolicyMonths] = React.useState("4");
  const [policyDays, setPolicyDays] = React.useState("0");
  const [policyDesc, setPolicyDesc] = React.useState("");
  const [isSavingPolicy, setIsSavingPolicy] = React.useState(false);

  // Correction Review Modal State
  const [reviewingCorrection, setReviewingCorrection] = React.useState<DonationCorrectionRequest | null>(null);
  const [correctionDecision, setCorrectionDecision] = React.useState<"APPROVED" | "REJECTED">("APPROVED");
  const [adminResolutionNotes, setAdminResolutionNotes] = React.useState("");
  const [isProcessingCorrection, setIsProcessingCorrection] = React.useState(false);

  // Audit filter state
  const [auditFilter, setAuditFilter] = React.useState<string>("ALL");

  // Fetch initial data
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [donorsRes, policiesRes, correctionsRes, auditRes] = await Promise.all([
        fetch("/api/donors", { cache: "no-store" }),
        fetch("/api/admin/policies", { cache: "no-store" }),
        fetch("/api/admin/correction-requests", { cache: "no-store" }),
        fetch("/api/admin/audit-logs", { cache: "no-store" }),
      ]);

      if (donorsRes.ok) {
        const d = await donorsRes.json();
        setDonors(d.donors || []);
      }
      if (policiesRes.ok) {
        const p = await policiesRes.json();
        setPolicies(p.policies || []);
      }
      if (correctionsRes.ok) {
        const c = await correctionsRes.json();
        setCorrections(c.requests || []);
      }
      if (auditRes.ok) {
        const a = await auditRes.json();
        setAuditLogs(a.auditLogs || []);
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
      toast.error("Failed to fetch administrative data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Selected donor metadata for live cooldown check
  const selectedDonor = React.useMemo(() => {
    return donors.find((d) => d.id === selectedDonorId) || null;
  }, [donors, selectedDonorId]);

  // Cooldown details for the currently selected donor
  const donorCooldownInfo = React.useMemo(() => {
    if (!selectedDonor) return null;
    return getCooldownDetails(
      selectedDonor.last_donation_date || (selectedDonor as any).lastDonationDate,
      selectedDonor.next_eligible_donation_date || (selectedDonor as any).nextEligibleDonationDate,
      selectedDonor.donation_eligibility_status || (selectedDonor as any).eligibilityStatus
    );
  }, [selectedDonor]);

  // Handle Recording a Verified Donation
  const handleRecordDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonorId) {
      toast.error("Please select a donor.");
      return;
    }

    if (donorCooldownInfo?.isOnCooldown && !isOverride) {
      toast.error("Donor is currently on cooldown. Cooldown override is required to proceed.");
      return;
    }

    if (isOverride && (!overrideReason || overrideReason.trim().length < 5)) {
      toast.error("A mandatory reason (min 5 chars) is required for clinical cooldown overrides.");
      return;
    }

    setIsSubmittingDonation(true);
    try {
      const res = await fetch(`/api/donors/${selectedDonorId}/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donationDate: new Date(donationDate).toISOString(),
          donationType,
          facilityName: facilityName.trim() || "Blood Centre Clinic",
          unitsDonated: Number(unitsDonated) || 1,
          notes: staffNotes.trim(),
          verificationStatus: "VERIFIED",
          verifiedBy: staffName,
          isOverride,
          overrideReason: isOverride ? overrideReason.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record verified donation.");
      }

      toast.success(data.message || "Verified donation recorded successfully.");
      // Reset form
      setStaffNotes("");
      setIsOverride(false);
      setOverrideReason("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Server rejected the donation record.");
    } finally {
      setIsSubmittingDonation(false);
    }
  };

  // Handle Policy Update Save
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;

    setIsSavingPolicy(true);
    try {
      const res = await fetch("/api/admin/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donationType: editingPolicy.donationType,
          cooldownMonths: Number(policyMonths) || 0,
          cooldownDays: Number(policyDays) || 0,
          description: policyDesc.trim(),
          actorName: staffName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update policy.");
      }

      toast.success(`Policy for ${editingPolicy.name} updated successfully.`);
      setEditingPolicy(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error updating policy.");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // Handle Reviewing Correction Request
  const handleProcessCorrection = async () => {
    if (!reviewingCorrection) return;

    setIsProcessingCorrection(true);
    try {
      const res = await fetch("/api/admin/correction-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: reviewingCorrection.id,
          decision: correctionDecision,
          adminNotes: adminResolutionNotes.trim() || undefined,
          actorName: staffName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process correction request.");
      }

      toast.success(`Correction request ${correctionDecision.toLowerCase()} successfully.`);
      setReviewingCorrection(null);
      setAdminResolutionNotes("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Error processing correction.");
    } finally {
      setIsProcessingCorrection(false);
    }
  };

  // Filtered audit logs
  const filteredAuditLogs = React.useMemo(() => {
    if (auditFilter === "ALL") return auditLogs;
    return auditLogs.filter((log) => log.action === auditFilter);
  }, [auditLogs, auditFilter]);

  if (currentUserRole === "unauthorized") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-800">
          <Lock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-stone-900">Access Restricted</h1>
          <p className="text-sm text-stone-600">
            This administrative module requires authorized medical or blood-bank personnel privileges.
          </p>
        </div>
        <div className="pt-4 flex justify-center gap-3">
          <Button
            variant="primary"
            onClick={() => {
              setCurrentUserRole("admin");
              toast.success("Switched to Authorized Medical Officer session.");
            }}
          >
            Switch to Medical Officer Role
          </Button>
          <Link href="/">
            <Button variant="outline">Return to Directory</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Prominent Clinical Disclaimer */}
      <SafetyDisclaimerBanner />

      {/* Top Header & Role Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Medical Staff & Administrative Control Desk
            </span>
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold">
              Authorized Only
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Donor Eligibility & Cooldown Governance
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Enforce medical deferrals, record verified donations, manage interval policies, and review audit trails.
          </p>
        </div>

        {/* Demo Role / Staff Toggle Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-stone-100/80 p-2 rounded-2xl border border-stone-200">
          <div className="flex items-center gap-1.5 px-2 text-xs font-medium text-stone-700">
            <User className="h-3.5 w-3.5 text-stone-500" />
            <span>Staff Session:</span>
          </div>
          <select
            value={currentUserRole}
            onChange={(e) => {
              const role = e.target.value as any;
              setCurrentUserRole(role);
              if (role === "admin") setStaffName("Dr. K. Rao (Chief Medical Officer)");
              if (role === "staff") setStaffName("Nurse Priya (Blood Bank Staff)");
              if (role === "unauthorized") toast.error("Switched to Unauthorized Donor account.");
            }}
            className="text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-700"
          >
            <option value="admin">Chief Medical Officer (Full Admin)</option>
            <option value="staff">Blood Bank Staff (Verification)</option>
            <option value="unauthorized">Regular Donor (Unauthorized)</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="h-8 px-2.5 gap-1.5 text-xs text-stone-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab("donations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === "donations"
              ? "bg-red-800 text-white shadow-sm"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          <span>Record & Verify Donations</span>
        </button>

        <button
          onClick={() => setActiveTab("policies")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === "policies"
              ? "bg-red-800 text-white shadow-sm"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Cooldown Policies</span>
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-stone-200">
            {policies.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab("corrections")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === "corrections"
              ? "bg-red-800 text-white shadow-sm"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <FileEdit className="h-4 w-4" />
          <span>Correction Requests</span>
          {corrections.filter((c) => c.status === "PENDING").length > 0 && (
            <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 h-4 font-bold">
              {corrections.filter((c) => c.status === "PENDING").length}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
            activeTab === "audit"
              ? "bg-red-800 text-white shadow-sm"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Audit & Override Log</span>
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-stone-200">
            {auditLogs.length}
          </Badge>
        </button>
      </div>

      {/* TAB 1: RECORD & VERIFY DONATIONS */}
      {activeTab === "donations" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Donation Entry Form */}
          <div className="lg:col-span-7">
            <Card className="border-stone-200/90 shadow-sm">
              <CardHeader className="bg-stone-50/70 border-b border-stone-200 pb-4">
                <CardTitle className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-red-800" />
                  Log Official Verified Blood Donation
                </CardTitle>
                <CardDescription className="text-xs text-stone-500">
                  Select a registered donor. The server will calculate their next eligible date according to current policies.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleRecordDonation} className="space-y-5">
                  {/* Select Donor */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Select Registered Donor *
                    </label>
                    <select
                      value={selectedDonorId}
                      onChange={(e) => {
                        setSelectedDonorId(e.target.value);
                        setIsOverride(false);
                        setOverrideReason("");
                      }}
                      className="w-full h-11 px-3 rounded-xl border border-stone-300 bg-white text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-700"
                      required
                    >
                      <option value="">-- Choose a donor from directory --</option>
                      {donors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.display_name || (d as any).fullName} ({d.blood_group}) - {d.city || "Visakhapatnam"} [
                          {(d as any).donationEligibilityStatus || d.donation_eligibility_status || "LIKELY_ELIGIBLE"}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Donor Cooldown Status Alert Box */}
                  {selectedDonor && donorCooldownInfo && (
                    <div
                      className={`p-4 rounded-xl border transition-all ${
                        donorCooldownInfo.isOnCooldown
                          ? "bg-amber-50/90 border-amber-300 text-amber-950"
                          : "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {donorCooldownInfo.isOnCooldown ? (
                          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">
                              {donorCooldownInfo.isOnCooldown
                                ? "Donor is Currently on Medical Cooldown"
                                : "Donor Likely Eligible for Donation"}
                            </span>
                            <Badge
                              variant={donorCooldownInfo.isOnCooldown ? "warning" : "success"}
                              className="text-[11px]"
                            >
                              {donorCooldownInfo.statusText}
                            </Badge>
                          </div>
                          <p className="text-xs leading-relaxed opacity-90">
                            {donorCooldownInfo.detailMessage}
                          </p>
                          {donorCooldownInfo.lastDonationDate && (
                            <p className="text-[11px] opacity-75">
                              Last Recorded Donation: {formatDate(donorCooldownInfo.lastDonationDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mandatory Clinical Override Section if On Cooldown */}
                  {donorCooldownInfo?.isOnCooldown && (
                    <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-5 w-5 text-red-700" />
                          <label
                            htmlFor="cooldown-override"
                            className="text-xs font-bold text-red-900 cursor-pointer uppercase tracking-wider"
                          >
                            Require Administrative Cooldown Override
                          </label>
                        </div>
                        <input
                          id="cooldown-override"
                          type="checkbox"
                          checked={isOverride}
                          onChange={(e) => setIsOverride(e.target.checked)}
                          className="h-4 w-4 text-red-700 rounded border-red-300 focus:ring-red-600 cursor-pointer"
                        />
                      </div>
                      <p className="text-xs text-red-800 leading-relaxed">
                        Server-side safety rules block recording donations for donors on cooldown. To proceed under physician supervision, enable this override and state the required clinical justification.
                      </p>

                      {isOverride && (
                        <div className="space-y-1.5 pt-1">
                          <label className="block text-xs font-bold text-red-950">
                            Clinical Override Reason * (Mandatory for compliance log)
                          </label>
                          <textarea
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="e.g. Authorized emergency apheresis donation authorized by Dr. Rao due to critical pediatric patient need."
                            rows={2}
                            className="w-full text-xs p-2.5 rounded-lg border border-red-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                            required
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Donation Type */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Donation Type *
                      </label>
                      <select
                        value={donationType}
                        onChange={(e) => setDonationType(e.target.value as DonationType)}
                        className="w-full h-10 px-3 rounded-xl border border-stone-300 bg-white text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-700"
                      >
                        <option value="whole_blood">Whole Blood (4 months interval)</option>
                        <option value="platelets">Platelets (14 days interval)</option>
                        <option value="plasma">Plasma (28 days interval)</option>
                        <option value="double_red_cells">Double Red Cells (112 days interval)</option>
                      </select>
                    </div>

                    {/* Donation Date */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Donation Date *
                      </label>
                      <Input
                        type="date"
                        value={donationDate}
                        onChange={(e) => setDonationDate(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Facility */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Blood Centre / Facility Name *
                      </label>
                      <Input
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        placeholder="e.g. Rotary Blood Bank"
                        required
                      />
                    </div>

                    {/* Units */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                        Units Collected
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="3"
                        value={unitsDonated}
                        onChange={(e) => setUnitsDonated(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Medical / Screening Notes (Optional)
                    </label>
                    <textarea
                      value={staffNotes}
                      onChange={(e) => setStaffNotes(e.target.value)}
                      placeholder="e.g. Post-donation vitals normal. Pre-screening Hb: 13.8 g/dL."
                      rows={2}
                      className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-700"
                    />
                  </div>

                  {/* Verifier Attestation */}
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs text-stone-600">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Recorded and Verified by: <strong className="text-stone-800">{staffName}</strong>
                    </span>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px]">
                      VERIFIED STATUS
                    </Badge>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmittingDonation || (donorCooldownInfo?.isOnCooldown && !isOverride)}
                    className="w-full font-bold"
                  >
                    {isSubmittingDonation ? "Saving to Database..." : "Commit Verified Donation Record"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Information & Directory Overview */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-stone-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Info className="h-4 w-4 text-red-700" />
                  Eligibility Calculation Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-stone-600 leading-relaxed">
                <p>
                  1. When a donation is logged, the server calculates the <strong>nextEligibleDonationDate</strong> using active cooldown policies (default 4 months for whole blood).
                </p>
                <p>
                  2. The donor status transitions to <strong>ON_COOLDOWN</strong> and their contact buttons are hidden in directory searches until the cooldown period expires.
                </p>
                <p>
                  3. If a donor donates during cooldown, server-side validation strictly blocks duplicate entries unless an authorized medical officer submits a documented justification.
                </p>
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-stone-700">
                  <span className="font-semibold block mb-1">Standard Safety Disclaimer:</span>
                  &ldquo;Final donation eligibility must be confirmed by qualified blood-bank or medical staff.&rdquo;
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-1">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Registered Donors
                </span>
                <p className="text-2xl font-black text-stone-900">{donors.length}</p>
              </div>
              <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-1">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Active Overrides
                </span>
                <p className="text-2xl font-black text-red-800">
                  {auditLogs.filter((l) => l.action === "COOLDOWN_OVERRIDE").length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COOLDOWN POLICIES CONFIGURATION */}
      {activeTab === "policies" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                Blood Donation Cooldown Policies
              </h2>
              <p className="text-xs text-stone-500">
                Policies define mandatory deferral intervals between donations. Administrators can edit these values without code redeployment.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {policies.map((policy) => (
              <Card key={policy.id} className="border-stone-200/90 shadow-sm hover:border-red-200 transition-all">
                <CardHeader className="bg-stone-50/70 border-b border-stone-200 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-stone-900">
                      {policy.name}
                    </CardTitle>
                    <span className="text-xs font-mono text-stone-500">
                      type: {policy.donationType}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingPolicy(policy);
                      setPolicyMonths(String(policy.cooldownMonths || 0));
                      setPolicyDays(String(policy.cooldownDays || 0));
                      setPolicyDesc(policy.description || "");
                    }}
                    className="gap-1 text-xs"
                  >
                    <Sliders className="h-3.5 w-3.5 text-stone-600" />
                    Configure Interval
                  </Button>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-center min-w-[90px]">
                      <span className="text-xs font-semibold text-red-700 block uppercase tracking-wider">
                        Cooldown
                      </span>
                      <span className="text-xl font-black text-red-950">
                        {policy.cooldownMonths > 0
                          ? `${policy.cooldownMonths} Mos`
                          : `${policy.cooldownDays} Days`}
                      </span>
                    </div>
                    <div className="text-xs text-stone-600 space-y-1">
                      <p>
                        <strong>Interval in Months:</strong> {policy.cooldownMonths} calendar months
                      </p>
                      <p>
                        <strong>Interval in Days:</strong> {policy.cooldownDays} days
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                    {policy.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-100">
                    <span>Last updated by: {policy.updatedBy || "Medical Advisory"}</span>
                    <span>{formatDate(policy.updatedAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CORRECTION REQUESTS */}
      {activeTab === "corrections" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              Donor Record Correction Requests
            </h2>
            <p className="text-xs text-stone-500">
              Donors cannot edit verified records directly. They submit adjustment requests with proof for medical staff review.
            </p>
          </div>

          {corrections.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 space-y-2">
              <FileEdit className="h-8 w-8 text-stone-400 mx-auto" />
              <p className="text-sm font-semibold text-stone-700">No correction requests found.</p>
              <p className="text-xs text-stone-500">
                When donors submit date or type corrections from their dashboard, they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {corrections.map((req) => (
                <Card key={req.id} className="border-stone-200/90 shadow-sm">
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            req.status === "APPROVED"
                              ? "success"
                              : req.status === "REJECTED"
                              ? "destructive"
                              : "warning"
                          }
                          className="text-xs font-bold"
                        >
                          {req.status}
                        </Badge>
                        <span className="text-xs font-bold text-stone-800">
                          {req.requestType.replace("_", " ")}
                        </span>
                        <span className="text-xs text-stone-400">•</span>
                        <span className="text-xs text-stone-500">
                          Submitted on {formatDate(req.createdAt)}
                        </span>
                      </div>

                      <div className="text-xs text-stone-700 space-y-1">
                        <p>
                          <strong>Donor ID:</strong> <span className="font-mono">{req.donorId}</span>
                        </p>
                        {req.proposedDate && (
                          <p>
                            <strong>Proposed Correct Date:</strong> {formatDate(req.proposedDate)}
                          </p>
                        )}
                        {req.proposedType && (
                          <p>
                            <strong>Proposed Donation Type:</strong> {req.proposedType}
                          </p>
                        )}
                        {req.donorReason && (
                          <p className="bg-stone-50 p-2 rounded-lg border border-stone-200 mt-1 italic">
                            &ldquo;{req.donorReason}&rdquo;
                          </p>
                        )}
                      </div>

                      {req.adminNotes && (
                        <p className="text-[11px] text-stone-500">
                          <strong>Admin Resolution:</strong> {req.adminNotes} (by {req.reviewedBy})
                        </p>
                      )}
                    </div>

                    {req.status === "PENDING" && (
                      <div className="flex sm:flex-col gap-2 shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setReviewingCorrection(req);
                            setCorrectionDecision("APPROVED");
                            setAdminResolutionNotes("Verified against clinic registry.");
                          }}
                          className="font-bold text-xs"
                        >
                          Review & Resolve
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">
                Medical & Compliance Audit Trail
              </h2>
              <p className="text-xs text-stone-500">
                Immutable chronological log of all policy edits, cooldown overrides, and verification events.
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-600">Filter Event:</span>
              <select
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="text-xs bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 font-medium text-stone-800"
              >
                <option value="ALL">All Events ({auditLogs.length})</option>
                <option value="COOLDOWN_OVERRIDE">Cooldown Overrides</option>
                <option value="POLICY_UPDATED">Policy Updates</option>
                <option value="DONATION_VERIFIED">Donations Verified</option>
                <option value="CORRECTION_PROCESSED">Correction Requests</option>
              </select>
            </div>
          </div>

          {filteredAuditLogs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 space-y-2">
              <History className="h-8 w-8 text-stone-400 mx-auto" />
              <p className="text-sm font-semibold text-stone-700">No matching audit events.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50 border-b border-stone-200 font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Performed By</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Clinical Justification / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-stone-500 font-mono text-[11px]">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant={
                            log.action === "COOLDOWN_OVERRIDE"
                              ? "destructive"
                              : log.action === "POLICY_UPDATED"
                              ? "default"
                              : "success"
                          }
                          className="font-bold text-[10px]"
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-stone-800">
                        {log.performedBy} <span className="text-[10px] text-stone-500">({log.performerRole})</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-stone-600">
                        {log.targetDonorId || log.targetDonationId || "Global Policy"}
                      </td>
                      <td className="px-4 py-3 text-stone-700 max-w-xs sm:max-w-md truncate">
                        {log.reason ? (
                          <span className="font-semibold text-red-900 bg-red-50 px-1.5 py-0.5 rounded">
                            {log.reason}
                          </span>
                        ) : (
                          JSON.stringify(log.details || {})
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Policy Modal */}
      {editingPolicy && (
        <Modal
          isOpen={!!editingPolicy}
          onClose={() => setEditingPolicy(null)}
          title={`Configure Cooldown Policy: ${editingPolicy.name}`}
          description="Adjust the mandatory recovery interval enforced before donors can be selected for this donation type."
          size="md"
        >
          <form onSubmit={handleSavePolicy} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Cooldown (Calendar Months)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={policyMonths}
                  onChange={(e) => setPolicyMonths(e.target.value)}
                  required
                />
                <span className="text-[11px] text-stone-500">Standard for Whole Blood: 4</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Cooldown (Days)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={policyDays}
                  onChange={(e) => setPolicyDays(e.target.value)}
                  required
                />
                <span className="text-[11px] text-stone-500">Used if months is 0 (e.g. 14 for platelets)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Medical Advisory Description
              </label>
              <textarea
                value={policyDesc}
                onChange={(e) => setPolicyDesc(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <Button type="button" variant="outline" onClick={() => setEditingPolicy(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSavingPolicy} className="font-bold">
                {isSavingPolicy ? "Saving Policy..." : "Update Policy & Log Audit"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Review Correction Request Modal */}
      {reviewingCorrection && (
        <Modal
          isOpen={!!reviewingCorrection}
          onClose={() => setReviewingCorrection(null)}
          title="Review Donor Correction Request"
          description="Verify hospital logs before approving changes to verified donation records."
          size="md"
        >
          <div className="space-y-4 py-2">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5 text-stone-700">
              <p>
                <strong>Request Type:</strong> {reviewingCorrection.requestType}
              </p>
              {reviewingCorrection.proposedDate && (
                <p>
                  <strong>Proposed Date:</strong> {formatDate(reviewingCorrection.proposedDate)}
                </p>
              )}
              {reviewingCorrection.proposedType && (
                <p>
                  <strong>Proposed Type:</strong> {reviewingCorrection.proposedType}
                </p>
              )}
              <p>
                <strong>Donor&apos;s Reason:</strong> &ldquo;{reviewingCorrection.donorReason}&rdquo;
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Review Decision *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCorrectionDecision("APPROVED")}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                    correctionDecision === "APPROVED"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500"
                      : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  Approve Correction
                </button>
                <button
                  type="button"
                  onClick={() => setCorrectionDecision("REJECTED")}
                  className={`p-3 rounded-xl border text-center text-xs font-bold transition-all ${
                    correctionDecision === "REJECTED"
                      ? "bg-red-50 border-red-500 text-red-900 ring-2 ring-red-500"
                      : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  Reject Request
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Admin Resolution Notes
              </label>
              <textarea
                value={adminResolutionNotes}
                onChange={(e) => setAdminResolutionNotes(e.target.value)}
                placeholder="Reason for approval or rejection note for the donor."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
              <Button type="button" variant="outline" onClick={() => setReviewingCorrection(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={correctionDecision === "APPROVED" ? "primary" : "destructive"}
                onClick={handleProcessCorrection}
                disabled={isProcessingCorrection}
                className="font-bold"
              >
                {isProcessingCorrection ? "Processing..." : `Confirm ${correctionDecision}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
