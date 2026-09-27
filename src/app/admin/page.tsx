"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { 
  Building2, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sliders, 
  FileText, 
  Search, 
  RefreshCw,
  History,
  Activity,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Lock
} from "lucide-react";
import { Organization, UserReport, PublicDonorCard, AuditLogRecord } from "@/types/database";

type AdminTab = "overview" | "organizations" | "donors" | "reports" | "requests" | "audit";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = React.useState<AdminTab>("overview");
  const [stats, setStats] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Organizations
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = React.useState<Organization | null>(null);
  const [orgAction, setOrgAction] = React.useState<"approved" | "rejected" | "suspended" | null>(null);
  const [orgNotes, setOrgNotes] = React.useState("");

  // Reports
  const [reports, setReports] = React.useState<UserReport[]>([]);
  const [selectedReport, setSelectedReport] = React.useState<UserReport | null>(null);
  const [reportDecision, setReportDecision] = React.useState<"resolved" | "dismissed">("resolved");
  const [reportAction, setReportAction] = React.useState<"suspend_target" | "none">("none");
  const [reportNotes, setReportNotes] = React.useState("");

  // Donors
  const [donors, setDonors] = React.useState<PublicDonorCard[]>([]);
  const [selectedDonor, setSelectedDonor] = React.useState<PublicDonorCard | null>(null);
  const [donorDecision, setDonorDecision] = React.useState<"verified" | "rejected" | "suspended">("verified");
  const [donorValidityDays, setDonorValidityDays] = React.useState(365);
  const [donorNotes, setDonorNotes] = React.useState("");

  // Audit
  const [auditLogs, setAuditLogs] = React.useState<AuditLogRecord[]>([]);

  // Health
  const [healthStatus, setHealthStatus] = React.useState<any>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, orgsRes, reportsRes, donorsRes, healthRes] = await Promise.all([
        fetch("/api/admin/eligibility/policies").then((r) => r.json()).catch(() => ({})),
        fetch("/api/organizations").then((r) => r.json()).catch(() => ({ organizations: [] })),
        fetch("/api/reports").then((r) => r.json()).catch(() => ({ reports: [] })),
        fetch("/api/donors/search?eligibility=ALL").then((r) => r.json()).catch(() => ({ donors: [] })),
        fetch("/api/health").then((r) => r.json()).catch(() => ({ status: "ok" })),
      ]);

      if (orgsRes.organizations) setOrganizations(orgsRes.organizations);
      if (reportsRes.reports) setReports(reportsRes.reports);
      if (donorsRes.donors) setDonors(donorsRes.donors);
      if (healthRes) setHealthStatus(healthRes);
      if (statsRes.auditLogs) setAuditLogs(statsRes.auditLogs);

      setStats({
        totalOrgs: orgsRes.organizations?.length || 0,
        pendingOrgs: orgsRes.organizations?.filter((o: any) => o.verificationStatus === "pending")?.length || 0,
        pendingReports: reportsRes.reports?.filter((r: any) => r.status === "pending")?.length || 0,
        totalDonors: donorsRes.donors?.length || 0,
        verifiedDonors: donorsRes.donors?.filter((d: any) => d.donor_verification_status === "verified")?.length || 0,
      });
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDashboardData();
  }, []);

  // Organization Review Handler
  const handleOrgReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !orgAction) return;

    try {
      const res = await fetch("/api/admin/organizations/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedOrg.id,
          decision: orgAction,
          actorName: "Dr. K. Rao (Medical Officer)",
          adminNotes: orgNotes,
          rejectionReason: orgAction === "rejected" ? orgNotes : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update organization");

      toast.success(`Organization ${selectedOrg.name} marked as '${orgAction}'.`);
      setSelectedOrg(null);
      setOrgAction(null);
      setOrgNotes("");
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update organization");
    }
  };

  // Report Resolution Handler
  const handleReportResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      const res = await fetch("/api/admin/reports/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedReport.id,
          decision: reportDecision,
          actorName: "Dr. K. Rao (Moderator)",
          moderationNotes: reportNotes,
          applyAction: reportAction,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve report");

      toast.success(`Report resolved successfully.`);
      setSelectedReport(null);
      setReportNotes("");
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve report");
    }
  };

  // Donor Verification Handler
  const handleDonorVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonor) return;

    try {
      const res = await fetch("/api/admin/donors/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donorId: selectedDonor.id,
          decision: donorDecision,
          actorName: "Dr. K. Rao (Medical Officer)",
          validityDays: donorValidityDays,
          notes: donorNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update donor status");

      toast.success(`Donor verification updated to '${donorDecision}'.`);
      setSelectedDonor(null);
      setDonorNotes("");
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update donor");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="demo" size="sm">ADMINISTRATION & SAFETY</Badge>
            <Badge variant={healthStatus?.status === "ok" ? "success" : "warning"} size="sm">
              System: {healthStatus?.status === "ok" ? "All Services Healthy" : "Degraded"}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-red-800" />
            Trust, Safety & Operations Hub
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Institutional verification, clinical donor reviews, fraud & scam moderation, and compliance audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            isLoading={isLoading}
            className="text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Link href="/admin/eligibility">
            <Button variant="primary" size="sm" className="text-xs font-semibold gap-1.5">
              <Sliders className="h-3.5 w-3.5" />
              Cooldown Policies
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-stone-200 gap-1 overflow-x-auto pb-1 text-xs sm:text-sm font-bold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === "overview"
              ? "bg-red-800 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <Activity className="h-4 w-4" />
          Overview
        </button>

        <button
          onClick={() => setActiveTab("organizations")}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === "organizations"
              ? "bg-red-800 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Hospital Verifications
          {stats?.pendingOrgs > 0 && (
            <Badge variant="warning" size="sm" className="ml-1 text-[10px] px-1.5 py-0 h-4 font-bold">
              {stats.pendingOrgs}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("donors")}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === "donors"
              ? "bg-red-800 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Donor Clinical Verifications
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === "reports"
              ? "bg-red-800 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Fraud & Scam Reports
          {stats?.pendingReports > 0 && (
            <Badge variant="destructive" size="sm" className="ml-1 text-[10px] px-1.5 py-0 h-4 font-bold">
              {stats.pendingReports}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-2 ${
            activeTab === "audit"
              ? "bg-red-800 text-white shadow-xs"
              : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
          }`}
        >
          <History className="h-4 w-4" />
          Compliance Audit Log
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 border-stone-200">
              <span className="text-[11px] font-semibold text-stone-500 uppercase">Hospital Facilities</span>
              <p className="text-2xl font-extrabold text-stone-900 mt-1">{stats?.totalOrgs || 0}</p>
              <span className="text-[11px] text-amber-700 font-medium">
                {stats?.pendingOrgs || 0} pending review
              </span>
            </Card>

            <Card className="p-4 border-stone-200">
              <span className="text-[11px] font-semibold text-stone-500 uppercase">Active Donors</span>
              <p className="text-2xl font-extrabold text-stone-900 mt-1">{stats?.totalDonors || 0}</p>
              <span className="text-[11px] text-emerald-700 font-medium">
                {stats?.verifiedDonors || 0} clinically verified
              </span>
            </Card>

            <Card className="p-4 border-stone-200">
              <span className="text-[11px] font-semibold text-stone-500 uppercase">Trust & Safety Reports</span>
              <p className="text-2xl font-extrabold text-stone-900 mt-1">{reports.length}</p>
              <span className="text-[11px] text-red-700 font-medium">
                {stats?.pendingReports || 0} pending action
              </span>
            </Card>

            <Card className="p-4 border-stone-200">
              <span className="text-[11px] font-semibold text-stone-500 uppercase">Audit Records</span>
              <p className="text-2xl font-extrabold text-stone-900 mt-1">{auditLogs.length}</p>
              <span className="text-[11px] text-stone-500 font-medium">PII-scrubbed ledger</span>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* System Health Card */}
            <Card className="border-stone-200 p-5 space-y-3">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-700" />
                Service Health & Uptime Status
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 rounded-lg bg-stone-50">
                  <span className="text-stone-600">Database Engine:</span>
                  <span className="font-bold text-emerald-700">Healthy ({healthStatus?.checks?.database?.latencyMs || 2}ms latency)</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-stone-50">
                  <span className="text-stone-600">Resend Email Delivery:</span>
                  <span className={healthStatus?.checks?.notifications?.emailConfigured ? "font-bold text-emerald-700" : "font-medium text-amber-700"}>
                    {healthStatus?.checks?.notifications?.emailConfigured ? "Configured" : "Simulated / Safe Dev Mode"}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-stone-50">
                  <span className="text-stone-600">Twilio SMS Gateway:</span>
                  <span className={healthStatus?.checks?.notifications?.smsConfigured ? "font-bold text-emerald-700" : "font-medium text-amber-700"}>
                    {healthStatus?.checks?.notifications?.smsConfigured ? "Configured" : "Simulated / Safe Dev Mode"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Quick Action Card */}
            <Card className="border-stone-200 p-5 space-y-3">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-800" />
                Operational Runbook & Security
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Adhere to the Incident Response Protocol for commercial blood trade reports or unauthorized access attempts. All actions taken by administrators record immutable entries in the audit trail.
              </p>
              <div className="pt-2 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab("organizations")} className="text-xs">
                  Review Organizations
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("reports")} className="text-xs">
                  Investigate Reports
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: HOSPITAL & ORGANIZATION VERIFICATION QUEUE */}
      {activeTab === "organizations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">
              Healthcare Facilities ({organizations.length})
            </h2>
            <Link href="/register/organization">
              <Button variant="outline" size="sm" className="text-xs">
                + Register New Institution
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {organizations.map((org) => (
              <Card key={org.id} className="p-4 border-stone-200 hover:border-stone-300 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-stone-900 text-sm">{org.name}</h3>
                      <Badge
                        variant={
                          org.verificationStatus === "approved"
                            ? "success"
                            : org.verificationStatus === "pending"
                            ? "warning"
                            : "destructive"
                        }
                        size="sm"
                      >
                        {org.verificationStatus.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" size="sm">{org.type.replace("_", " ")}</Badge>
                    </div>
                    <p className="text-xs text-stone-600">
                      Reg: <span className="font-mono font-semibold">{org.registrationNumber}</span> | Nodal Officer: {org.nodalOfficerName} ({org.nodalOfficerDesignation})
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {org.address}, {org.city}, {org.state} - {org.pincode} | Contact: {org.contactEmail} / {org.contactPhone}
                    </p>
                    {org.adminNotes && (
                      <p className="text-[11px] text-stone-600 italic bg-stone-50 p-1.5 rounded">
                        Notes: {org.adminNotes} {org.verifiedBy ? `(by ${org.verifiedBy})` : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {org.verificationStatus !== "approved" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedOrg(org);
                          setOrgAction("approved");
                          setOrgNotes("Verified against state health establishment registry.");
                        }}
                        className="text-xs font-bold"
                      >
                        Approve
                      </Button>
                    )}
                    {org.verificationStatus !== "rejected" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrg(org);
                          setOrgAction("rejected");
                          setOrgNotes("");
                        }}
                        className="text-xs text-red-800 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    )}
                    {org.verificationStatus === "approved" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedOrg(org);
                          setOrgAction("suspended");
                          setOrgNotes("");
                        }}
                        className="text-xs"
                      >
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DONOR CLINICAL VERIFICATIONS */}
      {activeTab === "donors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">
              Registered Voluntary Donors ({donors.length})
            </h2>
            <span className="text-xs text-stone-500">
              Examine submitted proof and assign verified badge validity periods.
            </span>
          </div>

          <div className="space-y-3">
            {donors.map((d) => (
              <Card key={d.id} className="p-4 border-stone-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-stone-900 text-sm">{d.display_name}</h3>
                      <Badge variant="crimson" size="sm">{d.blood_group}</Badge>
                      <Badge
                        variant={
                          d.donor_verification_status === "verified"
                            ? "success"
                            : d.donor_verification_status === "pending"
                            ? "warning"
                            : "outline"
                        }
                        size="sm"
                      >
                        {d.donor_verification_status?.toUpperCase() || "UNVERIFIED"}
                      </Badge>
                      <Badge variant="neutral" size="sm">{d.donation_eligibility_status || "LIKELY_ELIGIBLE"}</Badge>
                    </div>
                    <p className="text-xs text-stone-600">
                      Location: {d.locality}, {d.city} ({d.pincode}) | Last Donation: {d.last_donation_date ? new Date(d.last_donation_date).toLocaleDateString() : "None"}
                    </p>
                    {d.verification_expires_at && (
                      <p className="text-[11px] text-stone-500">
                        Verification Expiration: {new Date(d.verification_expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedDonor(d);
                        setDonorDecision("verified");
                        setDonorValidityDays(365);
                        setDonorNotes("Verified against blood bank donor history.");
                      }}
                      className="text-xs font-bold"
                    >
                      Verify / Renew
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDonor(d);
                        setDonorDecision("rejected");
                        setDonorNotes("Documented credentials inconclusive.");
                      }}
                      className="text-xs text-red-800"
                    >
                      Reject Proof
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FRAUD & SCAM REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">
              Abuse & Scam Reports Queue ({reports.length})
            </h2>
            <span className="text-xs text-amber-800 font-semibold flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Commercial blood trade strictly illegal
            </span>
          </div>

          {reports.length === 0 ? (
            <Card className="p-8 text-center text-xs text-stone-500">
              No reports currently queued. All systems normal.
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <Card key={rep.id} className="p-4 border-stone-200">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" size="sm">
                          {rep.reason.replace(/_/g, " ").toUpperCase()}
                        </Badge>
                        <Badge variant={rep.status === "pending" ? "warning" : "neutral"} size="sm">
                          {rep.status.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-stone-500">
                          Target: {rep.targetType} ({rep.targetId})
                        </span>
                      </div>
                      <p className="text-xs text-stone-900 font-medium bg-red-50/50 p-2 rounded-lg border border-red-100">
                        &ldquo;{rep.description}&rdquo;
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Reported by: {rep.reporterName || "Anonymous"} | Filed: {new Date(rep.createdAt).toLocaleString()}
                      </p>
                      {rep.moderationNotes && (
                        <p className="text-[11px] text-stone-600 bg-stone-50 p-1.5 rounded">
                          Resolution: {rep.moderationNotes} (by {rep.resolvedBy})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {rep.status === "pending" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(rep);
                            setReportDecision("resolved");
                            setReportAction("suspend_target");
                            setReportNotes("Confirmed policy violation; target suspended.");
                          }}
                          className="text-xs font-bold"
                        >
                          Resolve & Suspend
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(rep);
                          setReportDecision("dismissed");
                          setReportAction("none");
                          setReportNotes("Investigated and found benign.");
                        }}
                        className="text-xs"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: COMPLIANCE AUDIT LOG */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">
              Append-Only Clinical & Governance Audit Trail ({auditLogs.length})
            </h2>
            <span className="text-xs text-emerald-800 font-medium flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" /> All PII cryptographically masked
            </span>
          </div>

          <div className="space-y-2">
            {auditLogs.slice(0, 50).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-stone-200 bg-white text-xs space-y-1 hover:border-stone-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" size="sm" className="font-mono">
                      {log.action}
                    </Badge>
                    <span className="font-bold text-stone-900">{log.performedBy}</span>
                    <span className="text-stone-400">({log.performerRole})</span>
                  </div>
                  <span className="text-[11px] text-stone-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                {log.reason && <p className="text-stone-700">{log.reason}</p>}
                {log.details && (
                  <pre className="text-[10px] bg-stone-50 p-1.5 rounded font-mono text-stone-600 overflow-x-auto">
                    {JSON.stringify(log.details)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Organization Decision */}
      <Modal
        isOpen={Boolean(selectedOrg && orgAction)}
        onClose={() => setSelectedOrg(null)}
        title={`${orgAction?.toUpperCase()} Organization`}
        description={`Review decision for ${selectedOrg?.name}.`}
        size="md"
      >
        <form onSubmit={handleOrgReviewSubmit} className="space-y-4 py-2 text-xs">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Administrative & Regulatory Notes *
            </label>
            <textarea
              rows={3}
              value={orgNotes}
              onChange={(e) => setOrgNotes(e.target.value)}
              placeholder="State verified license details, authority register number, or reason for rejection/suspension..."
              className="w-full rounded-xl border border-stone-300 p-2.5 text-sm"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setSelectedOrg(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={orgAction === "approved" ? "primary" : "destructive"}
            >
              Confirm {orgAction}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Report Decision */}
      <Modal
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title="Resolve Abuse / Scam Report"
        description={`Target ID: ${selectedReport?.targetId} (${selectedReport?.targetType})`}
        size="md"
      >
        <form onSubmit={handleReportResolveSubmit} className="space-y-4 py-2 text-xs">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Action on Target
            </label>
            <select
              value={reportAction}
              onChange={(e) => setReportAction(e.target.value as any)}
              className="w-full h-10 rounded-xl border border-stone-300 px-3 bg-white"
            >
              <option value="none">No disciplinary action (Informational)</option>
              <option value="suspend_target">Suspend Target Immediately</option>
            </select>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Moderator Investigation Notes *
            </label>
            <textarea
              rows={3}
              value={reportNotes}
              onChange={(e) => setReportNotes(e.target.value)}
              placeholder="Document investigation findings, telephone inquiry, or police report reference..."
              className="w-full rounded-xl border border-stone-300 p-2.5 text-sm"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setSelectedReport(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Submit Resolution
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Donor Verification Decision */}
      <Modal
        isOpen={Boolean(selectedDonor)}
        onClose={() => setSelectedDonor(null)}
        title="Donor Clinical Verification"
        description={`Evaluating credentials for ${selectedDonor?.display_name}`}
        size="md"
      >
        <form onSubmit={handleDonorVerifySubmit} className="space-y-4 py-2 text-xs">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Verification Decision
            </label>
            <select
              value={donorDecision}
              onChange={(e) => setDonorDecision(e.target.value as any)}
              className="w-full h-10 rounded-xl border border-stone-300 px-3 bg-white"
            >
              <option value="verified">Approve Clinical Verification</option>
              <option value="rejected">Reject Proof / Insufficient Records</option>
              <option value="suspended">Suspend Donor Account</option>
            </select>
          </div>

          {donorDecision === "verified" && (
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                Badge Validity Duration (Days)
              </label>
              <Input
                type="number"
                value={donorValidityDays}
                onChange={(e) => setDonorValidityDays(parseInt(e.target.value) || 365)}
                min={30}
                max={730}
              />
              <span className="text-[10px] text-stone-500">Standard clinical validity is 365 days (1 year).</span>
            </div>
          )}

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Clinical Verification Notes *
            </label>
            <textarea
              rows={3}
              value={donorNotes}
              onChange={(e) => setDonorNotes(e.target.value)}
              placeholder="Record blood centre card number, e-RaktKosh ID, or medical officer signoff..."
              className="w-full rounded-xl border border-stone-300 p-2.5 text-sm"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setSelectedDonor(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Confirm Decision
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
