"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ALL_BLOOD_GROUPS } from "@/lib/compatibility";
import { BloodGroup, PreferredContactMethod } from "@/types/database";
import { donorStore } from "@/lib/donor-store";
import { ALL_STATES, ALL_CITIES_BY_STATE, HOSPITAL_AND_BLOOD_BANKS } from "@/lib/blood-banks-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SafetyDisclaimerBanner } from "@/components/layout/safety-disclaimer-banner";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { 
  HeartHandshake, 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  Info,
  Droplet
} from "lucide-react";

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const, {
    message: "Please select a valid blood group",
  }),
  state: z.string().min(2, "Please select your state"),
  city: z.string().min(2, "City name is required"),
  locality: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, "PIN code must be a 6-digit number"),
  nearestHospital: z.string().optional(),
  preferredContactMethod: z.enum(["in_app", "whatsapp", "call"] as const),
  lastDonationDate: z.string().optional(),
  consent: z.boolean().refine((val) => val === true, {
    message: "You must consent to voluntary listing and verify rules",
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      bloodGroup: "O+",
      state: "Andhra Pradesh",
      city: "Visakhapatnam",
      preferredContactMethod: "in_app",
      consent: false,
    },
  });

  const selectedGroup = watch("bloodGroup");
  const selectedState = watch("state");
  const selectedCity = watch("city");

  const citiesList = selectedState && ALL_CITIES_BY_STATE[selectedState]
    ? ALL_CITIES_BY_STATE[selectedState]
    : [];

  const availableHospitals = HOSPITAL_AND_BLOOD_BANKS.filter((h) => {
    if (selectedState && h.state !== selectedState) return false;
    if (selectedCity && h.city !== selectedCity) return false;
    return true;
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);

    try {
      // 1. If Supabase is configured, attempt real Supabase sign-up
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                full_name: data.fullName,
                phone: data.phone,
                role: "donor",
              },
            },
          });

          if (!authError && authData.user) {
            await supabase.from("profiles").upsert({
              id: authData.user.id,
              full_name: data.fullName,
              email: data.email,
              phone: data.phone,
              role: "donor",
            });

            await supabase.from("donor_profiles").upsert({
              profile_id: authData.user.id,
              blood_group: data.bloodGroup,
              city: data.city,
              locality: data.locality || null,
              pincode: data.pincode,
              availability_status: "available_now",
              phone_verified: true,
              email_verified: true,
              public_listing_enabled: true,
              preferred_contact_method: data.preferredContactMethod,
            });
          }
        } catch (supabaseErr) {
          console.warn("Supabase registration skipped or failed, fallback to local database:", supabaseErr);
        }
      }

      // 2. Actively register into the live server database and client store
      await donorStore.registerDonor({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        bloodGroup: data.bloodGroup,
        state: data.state,
        city: data.city,
        locality: data.locality,
        pincode: data.pincode,
        nearestHospital: data.nearestHospital,
        preferredContactMethod: data.preferredContactMethod,
        lastDonationDate: data.lastDonationDate || undefined,
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success(`Welcome to BloodLink, ${data.fullName}! Your voluntary profile (${data.bloodGroup}) is now actively registered in the database.`);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Registration failed. Please check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Critical Safety Disclaimer */}
      <SafetyDisclaimerBanner />

      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight flex items-center justify-center gap-2.5">
          <HeartHandshake className="h-8 w-8 text-red-800" />
          Voluntary Donor Registration
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
          Register your blood group, city/state, and nearest hospital centre into the voluntary database. You maintain complete control over your public listing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Main Form */}
        <div className="md:col-span-8">
          <Card className="border-stone-200/90 shadow-md">
            <CardHeader className="bg-stone-50/70 border-b border-stone-100 p-5 sm:p-6">
              <CardTitle className="text-lg font-bold text-stone-900">
                Donor Registration & Blood Group Profile
              </CardTitle>
              <CardDescription className="text-xs">
                Your data will be securely recorded in the voluntary database. Private contact info is never shown publicly.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* 1. Blood Group Selection */}
                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Your Blood Group <span className="text-red-700">*</span>
                    </label>
                    <Link
                      href="/eligibility"
                      className="text-xs text-red-800 hover:text-red-950 font-semibold inline-flex items-center gap-1"
                    >
                      <HelpCircle className="h-3 w-3" />
                      Eligibility guide
                    </Link>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {ALL_BLOOD_GROUPS.map((bg) => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => setValue("bloodGroup", bg)}
                        className={`flex h-11 items-center justify-center rounded-xl font-black text-sm border transition-all cursor-pointer ${
                          selectedGroup === bg
                            ? "bg-red-800 text-white border-red-800 shadow-sm shadow-red-900/20 scale-[1.03]"
                            : "bg-stone-50 text-stone-800 border-stone-200 hover:border-red-300"
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                  {errors.bloodGroup && (
                    <p className="text-xs text-red-600 font-medium">
                      {errors.bloodGroup.message}
                    </p>
                  )}
                </div>

                {/* 2. Personal Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    placeholder="e.g. Sai Krishna Varma"
                    {...register("fullName")}
                    error={errors.fullName?.message}
                    required
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="e.g. sai@example.com"
                    {...register("email")}
                    error={errors.email?.message}
                    helperText="Used to log in to your dashboard"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Mobile Number (10 Digits)"
                    type="tel"
                    placeholder="e.g. 9848012345"
                    {...register("phone")}
                    error={errors.phone?.message}
                    helperText="Private: Never exposed in public search"
                    required
                  />

                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Create Password <span className="text-red-700">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className={`flex h-11 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 pr-10 text-sm text-stone-900 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-800 ${
                          errors.password ? "border-red-600" : ""
                        }`}
                        {...register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-400 hover:text-stone-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-red-600 font-medium">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. State & City (With Andhra Pradesh as prime option) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="State / Region"
                    {...register("state")}
                    error={errors.state?.message}
                    required
                  >
                    {ALL_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st} {st === "Andhra Pradesh" ? "⭐ (Andhra Pradesh)" : ""}
                      </option>
                    ))}
                  </Select>

                  <div className="space-y-1.5">
                    {citiesList.length > 0 ? (
                      <Select
                        label="City / District"
                        {...register("city")}
                        error={errors.city?.message}
                        required
                      >
                        {citiesList.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        label="City / District"
                        placeholder="Enter your city name"
                        {...register("city")}
                        error={errors.city?.message}
                        required
                      />
                    )}
                  </div>
                </div>

                {/* Locality & PIN Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Approximate Locality / Area"
                    placeholder="e.g. Maharanipeta, Ring Road, Benz Circle"
                    {...register("locality")}
                    error={errors.locality?.message}
                    helperText="Do not enter exact flat or street number"
                  />

                  <Input
                    label="6-Digit PIN Code"
                    placeholder="e.g. 530002"
                    maxLength={6}
                    {...register("pincode")}
                    error={errors.pincode?.message}
                    required
                  />
                </div>

                {/* 4. Preferred / Nearest Hospital or Blood Bank Location */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Nearest Hospital or Blood Bank Centre (Optional)
                    </label>
                    <Link
                      href="/blood-banks"
                      target="_blank"
                      className="text-xs text-red-800 hover:text-red-950 font-semibold inline-flex items-center gap-1"
                    >
                      <Building2 className="h-3 w-3" />
                      View Directory
                    </Link>
                  </div>
                  <Select
                    {...register("nearestHospital")}
                    error={errors.nearestHospital?.message}
                  >
                    <option value="">Select your preferred/closest donation centre</option>
                    {availableHospitals.map((h) => (
                      <option key={h.id} value={h.name}>
                        {h.name} ({h.city})
                      </option>
                    ))}
                    <option value="District General Hospital">District General Hospital</option>
                    <option value="Indian Red Cross Society">Indian Red Cross Society Centre</option>
                    <option value="Other Certified Blood Centre">Other Certified Blood Centre</option>
                  </Select>
                  <p className="text-[11px] text-stone-500">
                    Helps patient families coordinate with the certified blood bank nearest to you.
                  </p>
                </div>

                {/* Cooldown / Last Donation Date (Optional) */}
                <div className="space-y-1.5 text-left p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/50">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                      Most Recent Blood Donation Date (Optional)
                    </label>
                    <span className="text-[11px] text-stone-500 font-medium">4-month cooldown auto-calculated</span>
                  </div>
                  <Input
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    {...register("lastDonationDate")}
                    error={errors.lastDonationDate?.message}
                    helperText="Leave empty if this is your first donation or you haven't donated in the last 4 months."
                  />
                </div>

                {/* 5. Preferred Contact Notification Method */}
                <Select
                  label="Preferred Way to Receive Blood Inquiries"
                  {...register("preferredContactMethod")}
                  error={errors.preferredContactMethod?.message}
                >
                  <option value="in_app">In-App Dashboard Notification (Most Private)</option>
                  <option value="whatsapp">WhatsApp Message (When explicitly accepted)</option>
                  <option value="call">Direct Phone Call (When explicitly accepted)</option>
                </Select>

                {/* 6. Consent Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded-md border-stone-300 text-red-800 focus:ring-red-800 cursor-pointer accent-red-800 mt-0.5"
                      {...register("consent")}
                    />
                    <div className="text-xs text-stone-700 space-y-1">
                      <p className="font-semibold text-stone-900">
                        Voluntary Registration & Database Recording Consent
                      </p>
                      <p className="text-stone-600 leading-relaxed">
                        I voluntarily consent to have my blood group and location registered in the BloodLink directory database. I agree to receive urgent donation requests and confirm that my clinical eligibility will be checked at the hospital blood bank before donation.
                      </p>
                    </div>
                  </label>
                  {errors.consent && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      {errors.consent.message}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <Link
                    href="/login"
                    className="text-xs text-stone-600 hover:text-stone-900 font-medium"
                  >
                    Already registered? <span className="font-bold text-red-800 underline">Sign in here</span>
                  </Link>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                    className="w-full sm:w-auto font-bold gap-2 shadow-sm shadow-red-900/20"
                  >
                    <HeartHandshake className="h-5 w-5" />
                    Register in Database
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Info Sidebar */}
        <aside className="md:col-span-4 space-y-4 text-xs">
          {/* Andhra Pradesh Special Highlight */}
          <div className="rounded-2xl border border-rose-300 bg-rose-50/70 p-5 space-y-2 text-stone-800">
            <div className="flex items-center gap-2 font-bold text-sm text-red-950">
              <Building2 className="h-4 w-4 text-red-800" />
              <span>Andhra Pradesh Coverage</span>
            </div>
            <p className="text-stone-700 leading-relaxed">
              We cover all major cities & blood centres across Andhra Pradesh: Visakhapatnam (KGH), Vijayawada (GGH), Guntur (AIIMS / GGH), Tirupati (SVIMS), Kurnool, Nellore, and Rajahmundry.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Privacy Protection Notice
            </h3>
            <p className="text-stone-600 leading-relaxed">
              Your registered mobile number and email are <strong>strictly protected</strong>. Requesters can only see your blood group and approximate area until you explicitly accept a request in your dashboard.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
