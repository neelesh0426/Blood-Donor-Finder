"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ALL_BLOOD_GROUPS, ALL_COMPONENTS } from "@/lib/compatibility";
import { BloodGroup, UrgencyLevel, PublicDonorCard, BloodComponentType } from "@/types/database";
import { donorStore } from "@/lib/donor-store";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SafetyDisclaimerBanner } from "@/components/layout/safety-disclaimer-banner";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { 
  PlusCircle, 
  SendHorizontal, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  PhoneCall, 
  Clock, 
  Heart, 
  Info,
  Lock,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { ALL_STATES, ALL_CITIES_BY_STATE, HOSPITAL_AND_BLOOD_BANKS } from "@/lib/blood-banks-data";

function BloodRequestForm() {
  const searchParams = useSearchParams();

  const [patientBloodGroup, setPatientBloodGroup] = React.useState<BloodGroup>(
    (searchParams.get("bloodGroup") as BloodGroup) || "O+"
  );
  const [componentNeeded, setComponentNeeded] = React.useState<BloodComponentType>("whole_blood");
  const [state, setState] = React.useState(searchParams.get("state") || "Andhra Pradesh");
  const [city, setCity] = React.useState(searchParams.get("city") || "Visakhapatnam");
  const [locality, setLocality] = React.useState("");
  const [hospitalName, setHospitalName] = React.useState(searchParams.get("hospital") || "");
  const [neededDateTime, setNeededDateTime] = React.useState("");
  const [urgencyLevel, setUrgencyLevel] = React.useState<UrgencyLevel>("urgent");
  const [contactName, setContactName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [preferredContact, setPreferredContact] = React.useState("call");
  const [message, setMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Result state
  const [submissionResult, setSubmissionResult] = React.useState<{
    matchedCount: number;
    matchedDonors: PublicDonorCard[];
    hospitalName: string;
    city: string;
    bloodGroup: BloodGroup;
  } | null>(null);

  const [cities, setCities] = React.useState<Array<{ city: string; count: number }>>([]);

  React.useEffect(() => {
    setCities(donorStore.getCitiesWithCounts());
    const tomorrow = new Date(Date.now() + 24 * 3600000);
    setNeededDateTime(tomorrow.toISOString().slice(0, 16));

    if (searchParams.get("hospital")) {
      setHospitalName(searchParams.get("hospital")!);
    }
    if (searchParams.get("city")) {
      setCity(searchParams.get("city")!);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!city.trim() || !hospitalName.trim() || !contactName.trim() || !contactPhone.trim()) {
      toast.error("Please fill in all required hospital and contact details");
      return;
    }

    if (contactPhone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = donorStore.createBloodRequest({
        patientBloodGroup,
        city: city.trim(),
        locality: locality.trim(),
        hospitalName: hospitalName.trim(),
        neededAt: neededDateTime || new Date(Date.now() + 24 * 3600000).toISOString(),
        urgencyLevel,
        contactPersonName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        message: message.trim() || undefined,
      });

      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 },
      });

      setSubmissionResult({
        matchedCount: result.matchedDonorsCount,
        matchedDonors: result.matchedDonors,
        hospitalName: hospitalName.trim(),
        city: city.trim(),
        bloodGroup: patientBloodGroup,
      });

      toast.success("Blood request dispatched to eligible donors!");
    } catch {
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Critical Safety Disclaimer */}
      <SafetyDisclaimerBanner />

      {/* Visible Statutory Anti-Scam & Regulatory Advisory */}
      <div className="rounded-2xl border border-rose-300 bg-rose-50/90 p-4 sm:p-5 text-stone-900 space-y-2 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-red-900 text-sm">
          <ShieldAlert className="h-5 w-5 text-red-700 shrink-0" />
          <span>STATUTORY BLOOD SAFETY & ANTI-SCAM WARNING</span>
        </div>
        <p className="text-xs text-stone-700 leading-relaxed">
          <strong>Voluntary Blood Donation is 100% Free under Indian Law</strong> (National Blood Transfusion Policy & Drugs and Cosmetics Act). BloodLink strictly prohibits commercial blood sales, paid donation, or intermediary broker fees. <strong>BloodLink and voluntary donors never request money, tokens, or advance payment.</strong> If anyone solicits money via UPI, cash, or digital payment, report them immediately.
        </p>
      </div>

      {/* Hospital Organization Registration Prompt */}
      <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-sky-800 shrink-0" />
          <span>Hospital or Licensed Blood Centre? Register your clinical establishment for official verified broadcast authority.</span>
        </div>
        <Link href="/register/organization" className="font-bold text-sky-800 hover:text-sky-950 underline underline-offset-2 shrink-0">
          Facility Registration &rarr;
        </Link>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight flex items-center justify-center gap-2.5">
          <PlusCircle className="h-8 w-8 text-red-800" />
          Broadcast a Voluntary Blood Request
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
          Alert eligible voluntary donors in your city. We never ask for sensitive medical history or diagnoses.
        </p>
      </div>

      {submissionResult ? (
        /* Confirmation Screen */
        <Card className="border-emerald-200 bg-white shadow-lg overflow-hidden animate-in fade-in duration-300">
          <div className="bg-emerald-600 text-white p-6 sm:p-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">
              Blood Request Transmitted
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-md mx-auto">
              Your request for <strong>{submissionResult.bloodGroup}</strong> at{" "}
              <strong>{submissionResult.hospitalName}</strong> has been queued.
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Dispatch Summary
                </span>
                <Badge variant="crimson" size="sm">
                  {submissionResult.matchedCount} Donors Alerted
                </Badge>
              </div>

              <div className="text-xs text-stone-600 space-y-1.5">
                <p>
                  <strong>Eligible Compatible Donors in {submissionResult.city}: </strong>
                  {submissionResult.matchedCount} voluntary profiles matched based on blood group compatibility.
                </p>
                <p className="text-stone-500">
                  Voluntary donors review the facility and urgency details. When a donor accepts, their status will update in real time.
                </p>
              </div>
            </div>

            {/* Critical Independent Verification Alert */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <span>Crucial Healthcare Protocol Reminder</span>
              </div>
              <p className="leading-relaxed">
                Voluntary donors must independently confirm their availability, and blood bank staff must perform clinical hemoglobin screening, vital checks, and full cross-matching before any donation or transfusion takes place.
              </p>
              <p className="font-semibold text-red-900 pt-1">
                Emergency note: If the patient is facing an acute trauma or hemorrhage, please immediately contact your hospital blood bank or the national 108 / 104 emergency line.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/search" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto font-bold">
                  Browse Active Voluntary Donors
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setSubmissionResult(null)}
                className="w-full sm:w-auto"
              >
                Submit Another Request
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* The Blood Request Form */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-8">
            <Card className="border-stone-200/90 shadow-md">
              <CardHeader className="bg-stone-50/70 border-b border-stone-100 p-5 sm:p-6">
                <CardTitle className="text-lg font-bold text-stone-900">
                  Request Specifications
                </CardTitle>
                <CardDescription className="text-xs">
                  Provide hospital and timing details to match candidate donors.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Required Blood Component Selector */}
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                        Specific Blood Component Required <span className="text-red-700">*</span>
                      </label>
                      <span className="text-[11px] text-stone-500">Separation rules apply</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {ALL_COMPONENTS.map((comp) => (
                        <button
                          key={comp.id}
                          type="button"
                          onClick={() => setComponentNeeded(comp.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            componentNeeded === comp.id
                              ? "border-red-800 bg-red-50 text-red-950 font-semibold ring-1 ring-red-800"
                              : "border-stone-200 bg-white text-stone-700 hover:border-red-200"
                          }`}
                        >
                          <div className="text-xs font-bold">{comp.label}</div>
                          <div className="text-[10px] text-stone-500 truncate">{comp.shelfLife}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blood Group Selector */}
                  <div className="space-y-2 text-left">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Patient Blood Group Required <span className="text-red-700">*</span>
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                      {ALL_BLOOD_GROUPS.map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setPatientBloodGroup(bg)}
                          className={`flex h-11 items-center justify-center rounded-xl font-black text-sm border transition-all cursor-pointer ${
                            patientBloodGroup === bg
                              ? "bg-red-800 text-white border-red-800 shadow-sm shadow-red-900/20 scale-[1.03]"
                              : "bg-stone-50 text-stone-800 border-stone-200 hover:border-red-300"
                          }`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* State & City with Andhra Pradesh support */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="State / Region"
                      value={state}
                      onChange={(e) => {
                        const newSt = e.target.value;
                        setState(newSt);
                        const firstCity = ALL_CITIES_BY_STATE[newSt]?.[0] || "";
                        setCity(firstCity);
                      }}
                      required
                    >
                      {ALL_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st} {st === "Andhra Pradesh" ? "⭐ (Andhra Pradesh)" : ""}
                        </option>
                      ))}
                    </Select>

                    <div className="space-y-1.5">
                      <Select
                        label="City / District"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                      >
                        <option value="">Select Target City</option>
                        {(ALL_CITIES_BY_STATE[state] || []).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {/* Hospital / Blood Bank Selector & Custom Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                        Hospital / Blood Bank Facility <span className="text-red-700">*</span>
                      </label>
                      <Link
                        href="/blood-banks"
                        target="_blank"
                        className="text-xs text-red-800 hover:text-red-950 font-semibold inline-flex items-center gap-1"
                      >
                        <Building2 className="h-3 w-3" />
                        Explore Blood Banks Directory
                      </Link>
                    </div>

                    <Select
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      className="mb-2"
                    >
                      <option value="">Select from verified hospital blood centres in {city || state}</option>
                      {HOSPITAL_AND_BLOOD_BANKS.filter(
                        (h) => (!city || h.city === city) && (!state || h.state === state)
                      ).map((h) => (
                        <option key={h.id} value={h.name}>
                          {h.name} ({h.type})
                        </option>
                      ))}
                      <option value="District General Hospital">District General Hospital Blood Bank</option>
                      <option value="Government Medical College Hospital">Government Medical College Hospital</option>
                      <option value="Indian Red Cross Society Blood Centre">Indian Red Cross Society Blood Centre</option>
                      <option value="Other Medical Facility">Other / Enter Below</option>
                    </Select>

                    <Input
                      placeholder="Or type specific hospital name (e.g. King George Hospital, SVIMS, Care Hospital)"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      required
                    />
                  </div>

                  <Input
                    label="Approximate Hospital Area / Locality"
                    placeholder="e.g. Maharanipeta, Alipiri Road, Koramangala"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                  />

                  {/* Date/Time + Urgency Level */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Needed By Date & Time"
                      type="datetime-local"
                      value={neededDateTime}
                      onChange={(e) => setNeededDateTime(e.target.value)}
                      required
                    />

                    <Select
                      label="Urgency Level"
                      value={urgencyLevel}
                      onChange={(e) => setUrgencyLevel(e.target.value as UrgencyLevel)}
                      required
                    >
                      <option value="critical">🚨 Critical (Emergency / ICU)</option>
                      <option value="urgent">⚡ Urgent (Within 24 Hours)</option>
                      <option value="standard">📅 Standard (Scheduled Surgery)</option>
                    </Select>
                  </div>

                  {/* Contact Person Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Contact Person Name"
                      placeholder="e.g. Dr. Verma / S. Sharma"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                    />

                    <Input
                      label="Coordinator Contact Phone"
                      type="tel"
                      placeholder="e.g. 9820012345"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      required
                      helperText="Shared only with donors who accept"
                    />
                  </div>

                  {/* Optional Message */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Message / Special Units Required (Optional)
                    </label>
                    <textarea
                      rows={3}
                      className="flex w-full rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-800"
                      placeholder="e.g., 2 units PRBC required for cardiovascular bypass surgery tomorrow morning."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <p className="text-[11px] text-stone-500">
                      Do not include private patient medical diagnoses or records.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      isLoading={isSubmitting}
                      className="w-full sm:w-auto font-bold gap-2 shadow-sm shadow-red-900/20"
                    >
                      <SendHorizontal className="h-5 w-5" />
                      Broadcast to Compatible Donors
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Info Sidebar */}
          <aside className="md:col-span-4 space-y-4 text-xs">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                No Unnecessary Data
              </h3>
              <p className="text-stone-600 leading-relaxed">
                We only ask for the patient&apos;s blood group, hospital, and coordinator phone. We never collect or store confidential patient medical files.
              </p>
            </div>

            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/60 p-5 space-y-2 text-stone-800">
              <h4 className="font-bold text-red-950 uppercase tracking-wider text-xs">
                Zero Advance Fees
              </h4>
              <p className="text-stone-700 leading-relaxed">
                Voluntary blood donation is strictly non-commercial. Never pay money to any individual or intermediary claiming to arrange blood.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function RequestBloodPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-stone-500">
          Loading request form...
        </div>
      }
    >
      <BloodRequestForm />
    </React.Suspense>
  );
}
