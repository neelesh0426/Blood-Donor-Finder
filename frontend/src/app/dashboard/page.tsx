"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  AvailabilityStatus, 
  PreferredContactMethod, 
  BloodGroup, 
  DonorProfile, 
  Profile, 
  BloodRequest, 
  DonorRequestMatch,
  DonationRecord,
  DonationEligibilityStatus
} from "@/types/database";
import { donorStore } from "@/lib/donor-store";
import { formatDate } from "@/lib/utils";
import { 
  isDonorOnCooldown, 
  getCooldownDetails, 
  calculateNextEligibleDate, 
  determineDonationEligibility 
} from "@/lib/cooldown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { SafetyDisclaimerBanner } from "@/components/layout/safety-disclaimer-banner";
import { AvailabilityBadge } from "@/components/donor/availability-badge";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { 
  User, 
  Droplet, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  ShieldCheck, 
  Bell, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  PauseCircle, 
  Trash2, 
  Edit3, 
  AlertTriangle, 
  Lock,
  ArrowRight,
  ExternalLink,
  History,
  PlusCircle,
  Timer,
  Heart,
  Award,
  Activity,
  FileText,
  CalendarCheck,
  CalendarPlus,
  Info,
  ShieldAlert,
  Send
} from "lucide-react";
import { CorrectionModal } from "@/components/donor/correction-modal";

export default function DashboardPage() {
  const router = useRouter();

  // Donor and match state
  const [userRecord, setUserRecord] = React.useState<{ profile: Profile; donor: DonorProfile } | null>(null);
  const [incomingMatches, setIncomingMatches] = React.useState<Array<{ match: DonorRequestMatch; request: BloodRequest }>>([]);
  const [donations, setDonations] = React.useState<DonationRecord[]>([]);
  const [correctionRequests, setCorrectionRequests] = React.useState<any[]>([]);
  const [activeTab, setActiveTab] = React.useState<"requests" | "history" | "profile">("requests");

  // Correction request modal state
  const [correctionModalOpen, setCorrectionModalOpen] = React.useState(false);
  const [selectedDonationForCorrection, setSelectedDonationForCorrection] = React.useState<DonationRecord | null>(null);

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [editFullName, setEditFullName] = React.useState("");
  const [editCity, setEditCity] = React.useState("");
  const [editLocality, setEditLocality] = React.useState("");
  const [editPincode, setEditPincode] = React.useState("");
  const [editContactMethod, setEditContactMethod] = React.useState<PreferredContactMethod>("in_app");
  const [editPhone, setEditPhone] = React.useState("");

  // Unavailable until date modal
  const [dateModalOpen, setDateModalOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState("");

  // Log Completed Blood Donation Modal state
  const [logDonationModalOpen, setLogDonationModalOpen] = React.useState(false);
  const [logDate, setLogDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [logFacility, setLogFacility] = React.useState("");
  const [logType, setLogType] = React.useState("whole_blood");
  const [logUnits, setLogUnits] = React.useState(1);
  const [logNotes, setLogNotes] = React.useState("");
  const [isLoggingDonation, setIsLoggingDonation] = React.useState(false);

  // Delete listing confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  // Load user data
  const [isLoaded, setIsLoaded] = React.useState(false);

  const refreshData = React.useCallback(async () => {
    const current = donorStore.getCurrentUser();
    setIsLoaded(true);

    if (current) {
      setUserRecord({ ...current });
      setEditFullName(current.profile.full_name);
      setEditCity(current.donor.city);
      setEditLocality(current.donor.locality || "");
      setEditPincode(current.donor.pincode);
      setEditContactMethod(current.donor.preferred_contact_method);
      setEditPhone(current.profile.phone);

      const matches = donorStore.getDonorIncomingMatches(current.profile.id);
      setIncomingMatches([...matches]);

      const history = await donorStore.getDonationHistory(current.profile.id);
      setDonations([...history]);

      try {
        const corrRes = await fetch(`/api/donors/${current.profile.id}/corrections`, { cache: "no-store" });
        if (corrRes.ok) {
          const corrData = await corrRes.json();
          if (corrData.requests) setCorrectionRequests(corrData.requests);
        }
      } catch (err) {
        console.warn("Could not load correction requests:", err);
      }
    } else {
      setUserRecord(null);
    }
  }, []);

  React.useEffect(() => {
    refreshData();

    const handleUpdate = () => refreshData();
    window.addEventListener("bloodlink_store_updated", handleUpdate);
    window.addEventListener("bloodlink_auth_changed", handleUpdate);

    return () => {
      window.removeEventListener("bloodlink_store_updated", handleUpdate);
      window.removeEventListener("bloodlink_auth_changed", handleUpdate);
    };
  }, [refreshData]);

  if (!isLoaded) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-stone-500">Checking active donor session...</p>
      </div>
    );
  }

  if (!userRecord) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-800 shadow-inner">
          <Droplet className="h-8 w-8 fill-red-800" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
            Donor Dashboard
          </h1>
          <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
            Please sign in to your registered donor account or register a new voluntary profile to manage your availability status, track donation cooldowns, and respond to incoming blood requests.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto font-bold shadow-sm">
              Sign In to Your Account
            </Button>
          </Link>
          <Link href="/register" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto font-bold">
              Register as Voluntary Donor
            </Button>
          </Link>
        </div>

        <div className="pt-6 border-t border-stone-200/80 text-xs text-stone-500">
          Want to find donors first?{" "}
          <Link href="/search" className="text-red-800 font-bold underline">
            Browse Live Search Directory
          </Link>
        </div>
      </div>
    );
  }

  const { profile, donor } = userRecord;

  // Donation Cooldown Calculations
  const lastDonation = donor.last_donation_date || donor.lastDonationDate || null;
  const nextEligible = donor.next_eligible_donation_date || donor.nextEligibleDonationDate || null;
  const onCooldown = isDonorOnCooldown(nextEligible) || 
    donor.donation_eligibility_status === "On Cooldown" || 
    donor.donationEligibilityStatus === "On Cooldown";
  const cooldown = getCooldownDetails(lastDonation, nextEligible);

  // Profile completeness calculation
  let completeness = 40; // Base: name, email, blood group
  if (donor.locality) completeness += 20;
  if (donor.phone_verified) completeness += 20;
  if (donor.email_verified) completeness += 20;

  // Handle Availability changes
  const handleAvailabilityChange = (status: AvailabilityStatus, date?: string | null) => {
    donorStore.updateAvailability(profile.id, status, date);
    toast.success(`Availability status updated to: ${status.replace("_", " ")}`);
    refreshData();
  };

  // Handle Public Listing Toggle
  const handleToggleListing = (enabled: boolean) => {
    donorStore.updateListingVisibility(profile.id, enabled);
    toast.success(
      enabled
        ? "Your profile is now visible in voluntary search results."
        : "Public listing paused. You will not appear in public search."
    );
    refreshData();
  };

  // Handle Match Response (Accept / Decline)
  const handleMatchResponse = (matchId: string, status: "accepted" | "declined") => {
    donorStore.updateMatchStatus(matchId, status);
    if (status === "accepted") {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      toast.success("Request accepted! Hospital coordination information is now accessible.");
    } else {
      toast.info("Request declined. The requester will look for other voluntary donors.");
    }
    refreshData();
  };

  // Log completed blood donation handler
  const handleLogDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!logDate) {
      toast.error("Please specify the completed donation date");
      return;
    }

    if (onCooldown && nextEligible) {
      toast.error(
        `Cannot record new donation: You are currently on a mandatory 4-month cooldown until ${cooldown.exactDateFormatted}.`
      );
      return;
    }

    setIsLoggingDonation(true);
    try {
      await donorStore.recordDonation(profile.id, {
        donationDate: logDate,
        facilityName: logFacility.trim() || undefined,
        donationType: logType,
        unitsDonated: Number(logUnits) || 1,
        notes: logNotes.trim() || undefined,
      });

      confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
      toast.success("Blood donation recorded! 4-month recovery cooldown has been initiated.");
      setLogDonationModalOpen(false);
      setLogFacility("");
      setLogNotes("");
      refreshData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to record blood donation");
    } finally {
      setIsLoggingDonation(false);
    }
  };

  // Save profile edits
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    donorStore.updateDonorProfile(profile.id, {
      fullName: editFullName,
      city: editCity,
      locality: editLocality,
      pincode: editPincode,
      preferredContactMethod: editContactMethod,
      phone: editPhone,
    });
    setIsEditingProfile(false);
    toast.success("Profile details updated successfully!");
    refreshData();
  };

  // Delete profile permanently
  const handleDeleteListing = () => {
    donorStore.deleteDonorProfile(profile.id);
    toast.success("Donor listing and profile removed permanently.");
    setDeleteModalOpen(false);
    router.push("/");
  };

  const newRequestsCount = incomingMatches.filter((m) => m.match.match_status === "new").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Prominent Safety Disclaimer */}
      <SafetyDisclaimerBanner compact />

      {/* Top Welcome Banner Card */}
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Blood Group Crest */}
            <div className={`flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-3xl text-white font-black text-2xl sm:text-3xl shadow-md ${
              onCooldown
                ? "bg-gradient-to-br from-stone-700 to-stone-900 shadow-stone-900/20"
                : "bg-gradient-to-br from-red-800 to-red-950 shadow-red-900/30"
            }`}>
              {donor.blood_group}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  Welcome, {profile.full_name}
                </h1>
                {donor.is_demo && (
                  <Badge variant="demo" size="sm">
                    Demo Donor Account
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs sm:text-sm text-stone-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-stone-400" />
                  {donor.city} {donor.locality ? `(${donor.locality})` : ""}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-stone-400" />
                  Last updated: {formatDate(donor.profile_updated_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Availability Badge & Switcher */}
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-semibold">Eligibility:</span>
              <AvailabilityBadge
                status={donor.availability_status}
                unavailableUntil={donor.unavailable_until}
                eligibilityStatus={donor.donation_eligibility_status || donor.donationEligibilityStatus}
                lastDonationDate={lastDonation}
                nextEligibleDate={nextEligible}
                size="md"
              />
            </div>

            {/* Public Listing Status Pill */}
            <div className="text-xs">
              {donor.public_listing_enabled ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Listed in Public Search
                </span>
              ) : (
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <PauseCircle className="h-3.5 w-3.5" />
                  Public Listing Paused
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3-Pillar Cooldown and Eligibility Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Pillar 1: Eligibility Status */}
          <div className={`p-4 rounded-2xl border transition-all ${
            onCooldown 
              ? "bg-amber-50/80 border-amber-200 text-amber-950" 
              : "bg-emerald-50/70 border-emerald-200 text-emerald-950"
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {onCooldown ? (
                <Timer className="h-4 w-4 text-amber-700" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Donation Eligibility
              </span>
            </div>
            <div className="font-extrabold text-base sm:text-lg">
              {onCooldown ? "On 4-Month Cooldown" : "Available to donate"}
            </div>
            <p className="text-xs mt-0.5 text-stone-600">
              {cooldown.remainingText}
            </p>
          </div>

          {/* Pillar 2: Last Donation Date */}
          <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/70">
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck className="h-4 w-4 text-red-800" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Last Donation Date
              </span>
            </div>
            <div className="font-extrabold text-base sm:text-lg text-stone-900">
              {lastDonation ? formatDate(lastDonation) : "None recorded"}
            </div>
            <p className="text-xs mt-0.5 text-stone-500">
              {donations.length > 0 ? `${donations.length} completed donation(s)` : "Ready for your first donation"}
            </p>
          </div>

          {/* Pillar 3: Next Eligible Donation Date */}
          <div className="p-4 rounded-2xl border border-stone-200 bg-stone-50/70">
            <div className="flex items-center gap-2 mb-1">
              <CalendarPlus className="h-4 w-4 text-red-800" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Next Eligible Date
              </span>
            </div>
            <div className="font-extrabold text-base sm:text-lg text-stone-900">
              {nextEligible && onCooldown ? cooldown.exactDateFormatted : "Eligible Today"}
            </div>
            <p className="text-xs mt-0.5 text-stone-500">
              {onCooldown ? "4-Month recovery period" : "Cleared for voluntary whole blood"}
            </p>
          </div>
        </div>

        {/* Cooldown Recovery Tracker Bar (If on cooldown) */}
        {onCooldown && cooldown && (
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-amber-950">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-amber-700 animate-spin-slow" />
                <span>Cooldown Recovery Tracker (4-Month Period)</span>
              </div>
              <span className="font-extrabold">{cooldown.percentElapsed}% Elapsed</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-amber-200/80 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500 rounded-full"
                style={{ width: `${cooldown.percentElapsed}%` }}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-amber-900 gap-1 leading-snug">
              <span>
                <strong>{cooldown.remainingText}</strong> ({cooldown.totalDaysRemaining} day{cooldown.totalDaysRemaining !== 1 ? "s" : ""} remaining until {cooldown.exactDateFormatted})
              </span>
              <span className="text-stone-500 italic">
                Red blood cell count and ferritin iron stores are regenerating.
              </span>
            </div>
          </div>
        )}

        {/* Profile Completeness Bar */}
        <div className="pt-2 border-t border-stone-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-stone-700">Profile Completeness</span>
            <span className="font-extrabold text-red-800">{completeness}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-red-800 transition-all duration-500 rounded-full"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
      </div>

      {/* Availability Controls Card */}
      <Card className="border-stone-200">
        <CardHeader className="bg-stone-50/70 border-b border-stone-100 p-4 sm:p-5">
          <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-red-800" />
            Manage Availability & Listing Status
          </CardTitle>
          <CardDescription className="text-xs">
            Keep your status updated so recipients only contact you when you are truly able to volunteer.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Available Now */}
            <button
              type="button"
              onClick={() => handleAvailabilityChange("available_now")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                donor.availability_status === "available_now"
                  ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                  : "bg-white border-stone-200 hover:border-emerald-300 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
                Available Now
              </div>
              <p className="text-xs text-stone-600 leading-snug">
                You are ready to coordinate for donation today or within 24 hours.
              </p>
            </button>

            {/* 2. Temporarily Unavailable */}
            <button
              type="button"
              onClick={() => handleAvailabilityChange("temporarily_unavailable")}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                donor.availability_status === "temporarily_unavailable"
                  ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                  : "bg-white border-stone-200 hover:border-amber-300 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-1">
                <Clock className="h-4 w-4" />
                Temporarily Unavailable
              </div>
              <p className="text-xs text-stone-600 leading-snug">
                Traveling, busy, or resting. You will not receive emergency alerts.
              </p>
            </button>

            {/* 3. Unavailable Until Date */}
            <button
              type="button"
              onClick={() => setDateModalOpen(true)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                donor.availability_status === "unavailable_until"
                  ? "bg-stone-100 border-stone-500 ring-2 ring-stone-400/20 shadow-xs"
                  : "bg-white border-stone-200 hover:border-stone-400 hover:bg-stone-50"
              }`}
            >
              <div className="flex items-center gap-2 text-stone-800 font-bold text-sm mb-1">
                <Calendar className="h-4 w-4 text-stone-600" />
                Unavailable Until Date
              </div>
              <p className="text-xs text-stone-600 leading-snug">
                {donor.unavailable_until
                  ? `Resting until ${new Date(donor.unavailable_until).toLocaleDateString("en-IN")}`
                  : "Set custom resting recovery date."}
              </p>
            </button>
          </div>

          {/* Toggle Public Search Visibility */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200/80">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-stone-900">
                Public Search Directory Visibility
              </p>
              <p className="text-xs text-stone-500">
                When enabled, your anonymized profile (name initial & city) appears in search results.
              </p>
            </div>

            <Button
              variant={donor.public_listing_enabled ? "outline" : "primary"}
              size="sm"
              onClick={() => handleToggleListing(!donor.public_listing_enabled)}
              className="font-bold text-xs"
            >
              {donor.public_listing_enabled ? "Pause Public Listing" : "Resume Public Listing"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Incoming Requests, Donation History & Cooldown, Profile Settings */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors shrink-0 cursor-pointer ${
              activeTab === "requests"
                ? "bg-red-800 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Bell className="h-4 w-4" />
            Incoming Blood Requests
            {newRequestsCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-red-900 text-[10px] font-black">
                {newRequestsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors shrink-0 cursor-pointer ${
              activeTab === "history"
                ? "bg-red-800 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <History className="h-4 w-4" />
            Donation History & Cooldown
            {donations.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-red-900 text-[10px] font-black">
                {donations.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors shrink-0 cursor-pointer ${
              activeTab === "profile"
                ? "bg-red-800 text-white shadow-xs"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <User className="h-4 w-4" />
            Profile & Privacy Details
          </button>
        </div>

        {/* TAB 1: Incoming Blood Requests */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {incomingMatches.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-stone-200 bg-white space-y-3">
                <Bell className="h-8 w-8 text-stone-400 mx-auto" />
                <h3 className="font-bold text-stone-900 text-base">No incoming requests yet</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  When a patient in your city requires {donor.blood_group} blood and your profile is available, the request will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {incomingMatches.map(({ match, request }) => {
                  const isNew = match.match_status === "new";
                  const isAccepted = match.match_status === "accepted";
                  const isDeclined = match.match_status === "declined";

                  return (
                    <Card
                      key={match.id}
                      className={`transition-all border ${
                        isNew
                          ? "border-red-300 ring-2 ring-red-100 shadow-sm"
                          : isAccepted
                          ? "border-emerald-300 bg-emerald-50/20"
                          : "border-stone-200 opacity-80"
                      }`}
                    >
                      <CardContent className="p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-800 text-white font-black text-lg">
                              {request.patient_blood_group}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-stone-900 text-base">
                                  {request.hospital_name}
                                </h3>
                                <Badge
                                  variant={
                                    request.urgency_level === "critical"
                                      ? "destructive"
                                      : request.urgency_level === "urgent"
                                      ? "warning"
                                      : "neutral"
                                  }
                                  size="sm"
                                  className={request.urgency_level === "critical" ? "animate-pulse" : ""}
                                >
                                  {request.urgency_level.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3.5 w-3.5 text-stone-400" />
                                {request.city}{request.locality ? ` • ${request.locality}` : ""}
                              </p>
                            </div>
                          </div>

                          {/* Match Status Badge */}
                          <div className="text-left sm:text-right">
                            {isNew && <Badge variant="crimson" size="sm">New Request</Badge>}
                            {isAccepted && <Badge variant="success" size="sm">Accepted by You</Badge>}
                            {isDeclined && <Badge variant="neutral" size="sm">Declined</Badge>}
                          </div>
                        </div>

                        {/* Message / Details */}
                        {request.message && (
                          <div className="p-3.5 rounded-xl bg-stone-50 text-xs text-stone-700 leading-relaxed border border-stone-200/60">
                            <strong>Note from Requester:</strong> {request.message}
                          </div>
                        )}

                        {/* If Accepted: Show Safe Contact Workflow */}
                        {isAccepted && (
                          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs text-emerald-950">
                            <div className="flex items-center gap-2 font-bold">
                              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                              <span>Direct Hospital Coordination Details</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-medium">
                              <div>
                                <strong>Contact Person:</strong> {request.requester_name || "Hospital Caretaker"}
                              </div>
                              <div>
                                <strong>Phone:</strong> {request.requester_contact || "+91 98XXX XXXXX"}
                              </div>
                            </div>
                            <p className="text-[11px] text-emerald-800 pt-1">
                              Important: Always conduct donation inside the certified hospital blood bank under pathologist supervision.
                            </p>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
                          <span className="text-stone-500">
                            Received {formatDate(match.created_at)}
                          </span>

                          <div className="flex items-center gap-2">
                            {isNew && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleMatchResponse(match.id, "accepted")}
                                  className="font-bold gap-1 bg-emerald-700 hover:bg-emerald-800"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Accept & Coordinate
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMatchResponse(match.id, "declined")}
                                  className="text-stone-600 hover:bg-stone-50"
                                >
                                  <XCircle className="h-4 w-4 mr-1 text-stone-400" />
                                  Decline
                                </Button>
                              </>
                            )}

                            {isAccepted && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMatchResponse(match.id, "declined")}
                                className="text-stone-500"
                              >
                                Cancel Acceptance
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Donation History & Cooldown Tracking */}
        {activeTab === "history" && (
          <div className="space-y-6">
            {/* Header with CTA to record a donation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
              <div className="space-y-1">
                <h3 className="font-extrabold text-stone-900 text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-red-800" />
                  Voluntary Blood Donation History
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed max-w-xl">
                  Keep an accurate log of your donations to track your voluntary contribution and ensure healthy 4-month recovery cooldown intervals.
                </p>
              </div>

              <div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setLogDonationModalOpen(true)}
                  disabled={onCooldown}
                  className={`font-bold text-xs gap-1.5 shadow-xs ${
                    onCooldown ? "opacity-60 cursor-not-allowed bg-stone-300 text-stone-600 border border-stone-300" : ""
                  }`}
                  title={onCooldown ? `Cannot record donation: on cooldown until ${cooldown.exactDateFormatted}` : "Record a completed donation"}
                >
                  <PlusCircle className="h-4 w-4" />
                  {onCooldown ? "Cooldown Active (Logging Blocked)" : "Log Completed Blood Donation"}
                </Button>
              </div>
            </div>

            {/* Active Cooldown Banner if Resting */}
            {onCooldown && cooldown && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-amber-800 shrink-0 animate-spin-slow" />
                    <h4 className="font-bold text-sm text-amber-900">
                      Mandatory 4-Month Recovery Cooldown Active
                    </h4>
                  </div>
                  <Badge variant="warning" size="sm" className="font-bold">
                    {cooldown.remainingText}
                  </Badge>
                </div>

                <div className="text-xs text-amber-900/90 space-y-1 leading-relaxed">
                  <p>
                    Your most recent blood donation was completed on <strong>{lastDonation ? formatDate(lastDonation) : "recently"}</strong>.
                    Per blood transfusion safety standards, whole blood donors must observe a minimum 4-month (120-day) deferral window before their next donation.
                  </p>
                  <p className="font-semibold text-amber-950">
                    Your next eligible donation date is: <strong>{cooldown.exactDateFormatted}</strong>.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] text-amber-800 font-semibold">
                    <span>Recovery Elapsed: {cooldown.percentElapsed}%</span>
                    <span>{cooldown.totalDaysRemaining} day{cooldown.totalDaysRemaining !== 1 ? "s" : ""} remaining</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-amber-200 overflow-hidden">
                    <div
                      className="h-full bg-amber-600 rounded-full transition-all duration-500"
                      style={{ width: `${cooldown.percentElapsed}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Donation Records List */}
            {donations.length === 0 ? (
              <div className="p-8 sm:p-12 text-center rounded-3xl border border-stone-200 bg-white space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-red-800">
                  <Heart className="h-7 w-7" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h4 className="font-bold text-stone-900 text-base">No donation records yet</h4>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Have you donated blood recently at a licensed hospital or blood bank camp? Record it to track your cooldown and eligibility.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setLogDonationModalOpen(true)}
                  className="font-bold text-xs gap-1.5"
                >
                  <PlusCircle className="h-4 w-4 text-red-800" />
                  Log Your First Donation
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 px-1">
                  Past Completed Donations ({donations.length})
                </h4>

                <div className="grid grid-cols-1 gap-3.5">
                  {donations.map((item, idx) => {
                    const donDate = item.donation_date || item.donationDate;
                    const nextDate = item.next_eligible_date || item.nextEligibleDate;
                    const isCooldownForThis = isDonorOnCooldown(nextDate);
                    const verification = item.verification_status || item.verificationStatus || "VERIFIED";

                    return (
                      <div
                        key={item.id || idx}
                        className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 transition-all shadow-2xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-800 font-bold shrink-0 mt-0.5">
                              <Droplet className="h-5 w-5 fill-red-800" />
                            </span>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h5 className="font-bold text-stone-900 text-sm">
                                  {item.facility_name || item.facilityName || "Certified Hospital Blood Centre"}
                                </h5>
                                <Badge variant="crimson" size="sm">
                                  {(item.donation_type || item.donationType || "Whole Blood").replace("_", " ").toUpperCase()}
                                </Badge>
                                
                                {/* Verification Status Badge */}
                                {verification === "VERIFIED" ? (
                                  <Badge variant="success" size="sm" className="bg-emerald-50 text-emerald-800 border-emerald-200 gap-1 font-semibold">
                                    <ShieldCheck className="h-3 w-3" />
                                    Verified {item.verified_by || item.verifiedBy ? `by ${item.verified_by || item.verifiedBy}` : ""}
                                  </Badge>
                                ) : verification === "REJECTED" ? (
                                  <Badge variant="destructive" size="sm" className="gap-1">
                                    Rejected
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" size="sm" className="gap-1 bg-amber-50 text-amber-900 border-amber-300">
                                    Pending Staff Review
                                  </Badge>
                                )}

                                {(item.is_override || item.isOverride) && (
                                  <Badge variant="warning" size="sm" className="gap-1 bg-amber-100 text-amber-900 border-amber-300">
                                    Admin Override
                                  </Badge>
                                )}
                              </div>

                              <p className="text-xs text-stone-500 flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-stone-400" />
                                  <span>Donated on <strong>{formatDate(donDate)}</strong></span>
                                </span>
                                <span>•</span>
                                <span>Units: {item.units_donated || item.unitsDonated || 1} unit(s)</span>
                                {(item.override_reason || item.overrideReason) && (
                                  <span className="text-amber-800 italic">
                                    (Override Reason: {item.override_reason || item.overrideReason})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                            {isCooldownForThis ? (
                              <Badge variant="warning" size="sm" className="font-bold gap-1 bg-amber-50 text-amber-900 border-amber-300">
                                <Timer className="h-3 w-3" />
                                Cooldown Active
                              </Badge>
                            ) : (
                              <Badge variant="success" size="sm" className="font-bold gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Cooldown Completed
                              </Badge>
                            )}

                            {/* Request Correction CTA */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDonationForCorrection(item);
                                setCorrectionModalOpen(true);
                              }}
                              className="text-xs font-semibold gap-1 h-7 px-2.5 hover:bg-stone-50 text-stone-600 border-stone-200"
                              title="Request an official administrative correction if details or dates are inaccurate"
                            >
                              <Edit3 className="h-3 w-3 text-stone-500" />
                              Request Correction
                            </Button>
                          </div>
                        </div>

                        {/* Cooldown End & Notes */}
                        <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-600">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-stone-400" />
                            <span>
                              Next Likely Eligible Date:{" "}
                              <strong>{formatDate(nextDate)}</strong>
                            </span>
                          </div>

                          {(item.notes || item.notes) && (
                            <span className="text-stone-500 italic truncate max-w-sm">
                              Note: {item.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Integrity & Correction Guidance Card */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 text-xs text-stone-600 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-red-800 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-stone-900">Record Integrity Notice</span>
                    <p className="leading-relaxed">
                      To safeguard transfusion safety standards and prevent premature cooldown bypasses, donors cannot modify verified donation records directly. If any record contains inaccurate dates, facilities, or component types, click <strong>&quot;Request Correction&quot;</strong> and our administrative staff will verify and update your timeline.
                    </p>
                  </div>
                </div>

                {/* Submitted Correction Requests List */}
                {correctionRequests.length > 0 && (
                  <div className="space-y-3 pt-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 px-1 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-stone-500" />
                      Submitted Correction Requests ({correctionRequests.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {correctionRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-3.5 rounded-xl border border-stone-200 bg-white space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900">
                                {req.requestType === "UPDATE_DATE"
                                  ? "Date Correction"
                                  : req.requestType === "INCORRECT_TYPE"
                                  ? "Component Correction"
                                  : req.requestType === "ADD_RECORD"
                                  ? "Add Past Record"
                                  : "General Correction"}
                              </span>
                              <span className="text-stone-400">•</span>
                              <span className="text-stone-500">{formatDate(req.createdAt)}</span>
                            </div>
                            <Badge
                              variant={
                                req.status === "APPROVED"
                                  ? "success"
                                  : req.status === "REJECTED"
                                  ? "destructive"
                                  : "warning"
                              }
                              size="sm"
                            >
                              {req.status === "APPROVED"
                                ? "Approved"
                                : req.status === "REJECTED"
                                ? "Rejected"
                                : "Pending Staff Review"}
                            </Badge>
                          </div>
                          <p className="text-stone-600">{req.description}</p>
                          {req.adminNotes && (
                            <div className="p-2 bg-stone-50 rounded-lg text-[11px] text-stone-700 border border-stone-200">
                              <strong>Staff Response ({req.reviewedBy}):</strong> {req.adminNotes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Profile Settings & Cooldown Info */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-8 space-y-6">
              {/* Cooldown Record Display Card */}
              <Card className="border-stone-200">
                <CardHeader className="p-5 border-b border-stone-100">
                  <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-red-800" />
                    Official Blood Donation Cooldown Status
                  </CardTitle>
                  <CardDescription className="text-xs">
                    These metrics are automatically maintained based on your verified completed blood donation records.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-3.5 text-xs text-stone-700">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                      <span className="text-[11px] font-bold text-stone-500 uppercase block">Last Donation Date</span>
                      <span className="text-sm font-extrabold text-stone-900 mt-1 block">
                        {lastDonation ? formatDate(lastDonation) : "None recorded"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                      <span className="text-[11px] font-bold text-stone-500 uppercase block">Next Eligible Date</span>
                      <span className="text-sm font-extrabold text-stone-900 mt-1 block">
                        {nextEligible ? cooldown.exactDateFormatted : "Cleared for donation"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                      <span className="text-[11px] font-bold text-stone-500 uppercase block">Status</span>
                      <span className={`text-sm font-extrabold mt-1 block ${onCooldown ? "text-amber-700" : "text-emerald-700"}`}>
                        {onCooldown ? "On Cooldown" : "Eligible"}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-stone-500 leading-relaxed pt-1">
                    * In accordance with National Blood Transfusion Council norms, a 4-month deferral is enforced between whole blood donations to protect donor hemoglobin levels.
                  </p>
                </CardContent>
              </Card>

              {/* Edit Voluntary Profile Form */}
              <Card className="border-stone-200">
                <CardHeader className="p-5 border-b border-stone-100">
                  <CardTitle className="text-base font-bold text-stone-900">
                    Edit Voluntary Profile Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <Input
                      label="Full Name"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Email Address"
                        value={profile.email}
                        disabled
                        helperText="Email cannot be changed directly"
                      />

                      <Input
                        label="Phone Number"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        required
                        helperText="Private: Never displayed in public search"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input
                        label="City"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                        required
                      />

                      <Input
                        label="Approx. Locality"
                        value={editLocality}
                        onChange={(e) => setEditLocality(e.target.value)}
                      />

                      <Input
                        label="PIN Code"
                        value={editPincode}
                        onChange={(e) => setEditPincode(e.target.value)}
                        maxLength={6}
                        required
                      />
                    </div>

                    <Select
                      label="Preferred Contact Notification Method"
                      value={editContactMethod}
                      onChange={(e) => setEditContactMethod(e.target.value as PreferredContactMethod)}
                    >
                      <option value="in_app">In-App Dashboard Notification</option>
                      <option value="whatsapp">WhatsApp (Once Accepted)</option>
                      <option value="call">Phone Call (Once Accepted)</option>
                    </Select>

                    <div className="pt-2 flex justify-end">
                      <Button type="submit" variant="primary" className="font-bold">
                        Save Profile Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Danger Zone & Removal */}
            <div className="md:col-span-4 space-y-4">
              <Card className="border-red-200 bg-red-50/40">
                <CardHeader className="p-5 pb-2">
                  <CardTitle className="text-sm font-bold text-red-950 flex items-center gap-1.5">
                    <Trash2 className="h-4 w-4 text-red-800" />
                    Permanent Profile Removal
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-3 text-xs text-stone-700">
                  <p className="leading-relaxed">
                    You can permanently delete your donor listing and remove all stored data from the platform.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteModalOpen(true)}
                    className="w-full font-bold"
                  >
                    Delete Donor Profile Permanently
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Log Completed Blood Donation Modal */}
      <Modal
        isOpen={logDonationModalOpen}
        onClose={() => setLogDonationModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-red-800" />
            <span>Record Completed Blood Donation</span>
          </div>
        }
        description="Log your blood donation to calculate your mandatory 4-month recovery cooldown period."
        size="md"
      >
        <form onSubmit={handleLogDonationSubmit} className="space-y-4 py-2">
          {onCooldown && nextEligible ? (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                Donation Cooldown Active Until {cooldown.exactDateFormatted}
              </p>
              <p className="text-[11px] leading-relaxed">
                You cannot register a new blood donation while an existing 4-month cooldown is active.
                Remaining time: <strong>{cooldown.remainingText}</strong>.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-red-950 flex items-center gap-2">
              <Info className="h-4 w-4 text-red-800 shrink-0" />
              <span>
                Saving your donation date automatically calculates a 4-month recovery cooldown before your next eligible donation.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              type="date"
              label="Donation Date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              required
              disabled={onCooldown}
            />

            <Select
              label="Donation Type"
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
              disabled={onCooldown}
            >
              <option value="whole_blood">Whole Blood (350 ml / 450 ml)</option>
              <option value="platelets">Platelets (Apheresis)</option>
              <option value="plasma">Plasma</option>
              <option value="double_red_cells">Double Red Cells</option>
            </Select>
          </div>

          <Input
            label="Hospital / Blood Bank Centre"
            placeholder="e.g. AIIMS Blood Bank, Rotary Blood Centre"
            value={logFacility}
            onChange={(e) => setLogFacility(e.target.value)}
            disabled={onCooldown}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              type="number"
              label="Units Donated"
              value={logUnits}
              onChange={(e) => setLogUnits(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={2}
              required
              disabled={onCooldown}
            />

            <Input
              label="Certificate / Notes (Optional)"
              placeholder="e.g. Camp certificate #12345"
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
              disabled={onCooldown}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLogDonationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoggingDonation}
              disabled={onCooldown}
              className={`font-bold ${onCooldown ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Save Donation & Set Cooldown
            </Button>
          </div>
        </form>
      </Modal>

      {/* Unavailable Until Date Picker Modal */}
      <Modal
        isOpen={dateModalOpen}
        onClose={() => setDateModalOpen(false)}
        title="Set Unavailable Recovery Date"
        description="Select until which date you wish to rest or recover before receiving new donation inquiries."
        size="sm"
      >
        <div className="space-y-4 py-2">
          <Input
            type="date"
            label="Unavailable Until"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!selectedDate) {
                  toast.error("Please pick a date");
                  return;
                }
                handleAvailabilityChange("unavailable_until", selectedDate);
                setDateModalOpen(false);
              }}
            >
              Save Recovery Date
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Permanent Deletion"
        description="Are you sure you want to delete your voluntary donor profile? This action cannot be undone."
        size="sm"
      >
        <div className="space-y-4 py-2">
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 leading-relaxed">
            Your listing will be removed from directory searches and all incoming notifications will stop immediately.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteListing} className="font-bold">
              Yes, Delete Profile
            </Button>
          </div>
        </div>
      </Modal>

      {/* Donor Record Correction Request Modal */}
      {userRecord && (
        <CorrectionModal
          isOpen={correctionModalOpen}
          onClose={() => {
            setCorrectionModalOpen(false);
            setSelectedDonationForCorrection(null);
          }}
          donorId={userRecord.profile.id}
          selectedDonation={selectedDonationForCorrection}
          onSuccess={() => {
            refreshData();
          }}
        />
      )}
    </div>
  );
}
