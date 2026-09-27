"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { donorStore } from "@/lib/donor-store";
import { STORED_DATA_CATEGORIES, DATA_RETENTION_POLICY } from "@/lib/privacy/service";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  Download, 
  Trash2, 
  Bell, 
  Clock, 
  Lock, 
  Database, 
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Info
} from "lucide-react";
import { NotificationPreferences } from "@/types/database";

export default function PrivacySettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Preferences
  const [prefs, setPrefs] = React.useState<NotificationPreferences>({
    profileId: "",
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: false,
    urgentOnly: false,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
  });
  const [isSavingPrefs, setIsSavingPrefs] = React.useState(false);

  React.useEffect(() => {
    const user = donorStore.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      fetch(`/api/user/preferences?profileId=${user.profile.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.preferences) setPrefs(data.preferences);
        })
        .catch(() => {});
    } else {
      // Fallback for viewing privacy policies without login
      setCurrentUser({
        profile: { id: "guest_viewer", full_name: "Voluntary Donor" },
        donor: { blood_group: "O+" },
      });
    }
  }, []);

  const handleExportData = async () => {
    if (!currentUser?.profile?.id) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/user/export?profileId=${currentUser.profile.id}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bloodlink-data-export-${currentUser.profile.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Complete machine-readable personal data export downloaded.");
    } catch {
      toast.error("Could not export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!currentUser?.profile?.id) return;
    setIsSavingPrefs(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prefs, profileId: currentUser.profile.id }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Notification preferences and consent settings saved.");
    } catch {
      toast.error("Could not update preferences.");
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm account removal.");
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: currentUser.profile.id,
          confirmationText: "DELETE",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deletion failed");

      toast.success("Profile safely unlisted and personal contact data removed.");
      donorStore.setCurrentUserId(null);
      setDeleteModalOpen(false);
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-bold text-red-800 hover:text-red-950 inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3 w-3" /> Back to Donor Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-700" />
            Privacy & Data Governance
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Transparency on data stored, statutory retention limits, notification consent, and safe deletion.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            isLoading={isExporting}
            className="text-xs font-semibold gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export My Data (JSON)
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeleteConfirmText("");
              setDeleteModalOpen(true);
            }}
            className="text-xs font-semibold gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Safe Deletion
          </Button>
        </div>
      </div>

      {/* SECTION 1: WHAT WE STORE AND WHY */}
      <Card className="border-stone-200/90 shadow-xs">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Database className="h-4 w-4 text-red-800" />
            What Data BloodLink Stores & Why
          </CardTitle>
          <CardDescription className="text-xs">
            We adhere to strict data minimization. We only collect what is strictly necessary to save lives and prevent premature donation injury.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STORED_DATA_CATEGORIES.map((cat, i) => (
              <div
                key={i}
                className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-stone-900 text-sm">{cat.category}</h2>
                  <Badge variant={cat.isPubliclyVisible ? "warning" : "success"} size="sm">
                    {cat.isPubliclyVisible ? "Public Approximate" : "Strictly Confidential"}
                  </Badge>
                </div>
                <p className="text-stone-600 leading-relaxed">{cat.purpose}</p>
                <div className="border-t border-stone-200/60 pt-2 text-[11px] text-stone-500 space-y-0.5">
                  <p><strong>Fields:</strong> {cat.fields.join(", ")}</p>
                  <p><strong>Retention:</strong> {cat.retentionPeriod}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: NOTIFICATION PREFERENCES & QUIET HOURS */}
      <Card className="border-stone-200/90 shadow-xs">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Bell className="h-4 w-4 text-red-800" />
            Emergency Notification Consent & Channels
          </CardTitle>
          <CardDescription className="text-xs">
            Control which channels BloodLink can use to alert you when a hospital broadcasts a matching blood request.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Email Channel */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 bg-white cursor-pointer hover:border-red-300 transition-colors">
              <input
                type="checkbox"
                checked={prefs.emailEnabled}
                onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })}
                className="mt-1 h-4 w-4 accent-red-800 rounded-sm"
              />
              <div className="text-xs">
                <span className="font-bold text-stone-900 block">Email Alerts</span>
                <span className="text-stone-500">Urgent blood match dispatches via verified email.</span>
              </div>
            </label>

            {/* SMS Channel */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 bg-white cursor-pointer hover:border-red-300 transition-colors">
              <input
                type="checkbox"
                checked={prefs.smsEnabled}
                onChange={(e) => setPrefs({ ...prefs, smsEnabled: e.target.checked })}
                className="mt-1 h-4 w-4 accent-red-800 rounded-sm"
              />
              <div className="text-xs">
                <span className="font-bold text-stone-900 block">SMS Text Messages</span>
                <span className="text-stone-500">Instant SMS notification for critical hospital emergencies.</span>
              </div>
            </label>

            {/* Browser Push */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 bg-white cursor-pointer hover:border-red-300 transition-colors">
              <input
                type="checkbox"
                checked={prefs.pushEnabled}
                onChange={(e) => setPrefs({ ...prefs, pushEnabled: e.target.checked })}
                className="mt-1 h-4 w-4 accent-red-800 rounded-sm"
              />
              <div className="text-xs">
                <span className="font-bold text-stone-900 block">Web Push</span>
                <span className="text-stone-500">Desktop & mobile web browser push alerts.</span>
              </div>
            </label>
          </div>

          <div className="rounded-xl bg-stone-50 p-4 border border-stone-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-stone-900 block">Urgent & Critical Requests Only</span>
                <span className="text-stone-500">Only alert me for life-threatening trauma and emergency surgeries.</span>
              </div>
              <input
                type="checkbox"
                checked={prefs.urgentOnly}
                onChange={(e) => setPrefs({ ...prefs, urgentOnly: e.target.checked })}
                className="h-5 w-5 accent-red-800 rounded-sm"
              />
            </div>

            <div className="border-t border-stone-200 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-stone-900 block flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-stone-600" />
                  Quiet Hours (Mute Non-Critical Notifications)
                </span>
                <span className="text-stone-500">Silence voluntary match notifications during resting hours.</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={prefs.quietHoursEnabled}
                  onChange={(e) => setPrefs({ ...prefs, quietHoursEnabled: e.target.checked })}
                  className="h-4 w-4 accent-red-800 rounded-sm"
                />
                {prefs.quietHoursEnabled && (
                  <div className="flex items-center gap-1 text-xs">
                    <input
                      type="time"
                      value={prefs.quietHoursStart}
                      onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value })}
                      className="border border-stone-300 rounded px-1.5 py-0.5"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={prefs.quietHoursEnd}
                      onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value })}
                      className="border border-stone-300 rounded px-1.5 py-0.5"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSavePreferences}
            isLoading={isSavingPrefs}
            className="font-bold text-xs"
          >
            Save Notification Consent
          </Button>
        </CardContent>
      </Card>

      {/* SECTION 3: BACKUP, RECOVERY & STATUTORY RETENTION */}
      <Card className="border-stone-200/90 shadow-xs">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-700" />
            Configurable Retention & Disaster Recovery
          </CardTitle>
          <CardDescription className="text-xs">
            Regulatory audit trail parameters and backup safeguards.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <span className="font-medium text-stone-500 text-[11px] block">Inactive Donor Retention</span>
              <span className="font-bold text-stone-900 text-sm">
                {DATA_RETENTION_POLICY.INACTIVE_DONOR_CONTACT_RETENTION_DAYS / 365} Years
              </span>
              <p className="text-[10px] text-stone-500">Unupdated profiles notified before retention purge.</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <span className="font-medium text-stone-500 text-[11px] block">Closed Request Contact Mask</span>
              <span className="font-bold text-stone-900 text-sm">
                {DATA_RETENTION_POLICY.CLOSED_REQUEST_CONTACT_RETENTION_DAYS} Days
              </span>
              <p className="text-[10px] text-stone-500">Mutual phone access revokes after request concludes.</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
              <span className="font-medium text-stone-500 text-[11px] block">Clinical Cooldown Audit Log</span>
              <span className="font-bold text-stone-900 text-sm">
                {Math.round(DATA_RETENTION_POLICY.AUDIT_LOG_RETENTION_DAYS / 365)} Years
              </span>
              <p className="text-[10px] text-stone-500">Regulatory compliance retention under transfusion rules.</p>
            </div>
          </div>

          <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-stone-800 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-red-950">
              <Info className="h-4 w-4 text-red-700" />
              Backup Restoration & Access Governance
            </div>
            <p className="text-stone-700 leading-relaxed text-[11px]">
              Database snapshots are encrypted at rest with AES-256. Restoration privileges are strictly restricted to designated BloodLink System Administrators. Every database restoration requires two-person authorization and automatically records an immutable timestamped event in the administrative compliance log.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Safe Account Deletion Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Safe Account Deletion"
        description="Understand what happens to your voluntary donor profile upon deletion."
        size="md"
      >
        <form onSubmit={handleDeleteAccount} className="space-y-4 py-2 text-xs">
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-2 text-red-950">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-red-700" />
              Safe Deletion Sequence:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-red-900">
              <li>Your profile is <strong>immediately removed from public search</strong>.</li>
              <li>Your personal contact info (email, phone, home locality) is <strong>permanently scrubbed</strong>.</li>
              <li>Past verified donation dates are preserved in an <strong>anonymized ledger</strong> to ensure clinical blood transfusion safety registers remain regulatory compliant.</li>
            </ul>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
              Type <span className="font-mono text-red-800 font-bold">DELETE</span> to confirm:
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={deleteConfirmText !== "DELETE" || isDeleting}
              isLoading={isDeleting}
            >
              Permanently Remove Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
