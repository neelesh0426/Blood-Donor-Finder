"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Droplet, 
  Search, 
  HeartHandshake, 
  ShieldCheck, 
  Clock, 
  Users, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  Lock, 
  Activity,
  Layers,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { ALL_BLOOD_GROUPS } from "@/lib/compatibility";
import { donorStore } from "@/lib/donor-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SafetyDisclaimerBanner } from "@/components/layout/safety-disclaimer-banner";
import { BloodMatrix } from "@/components/educational/blood-matrix";

export default function HomePage() {
  const router = useRouter();

  // Search form state
  const [bloodGroup, setBloodGroup] = React.useState<string>("O+");
  const [city, setCity] = React.useState<string>("");
  const [pincode, setPincode] = React.useState<string>("");
  const [availableNow, setAvailableNow] = React.useState<boolean>(true);
  const [cities, setCities] = React.useState<Array<{ city: string; count: number }>>([]);
  const [dbStats, setDbStats] = React.useState<{ totalDonors: number; availableDonors: number } | null>(null);

  React.useEffect(() => {
    // Fetch live cities and database stats
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/database/status", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.stats) {
            setDbStats({
              totalDonors: json.stats.totalDonors,
              availableDonors: json.stats.availableDonors,
            });
          }
        }

        const donorsRes = await fetch("/api/donors", { cache: "no-store" });
        if (donorsRes.ok) {
          const dData = await donorsRes.json();
          if (dData.donors && Array.isArray(dData.donors)) {
            const map: Record<string, number> = {};
            for (const d of dData.donors) {
              if (d.city) map[d.city] = (map[d.city] || 0) + 1;
            }
            setCities(Object.entries(map).map(([c, count]) => ({ city: c, count })));
            return;
          }
        }
      } catch {}
      setCities(donorStore.getCitiesWithCounts());
    };

    fetchStatus();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (bloodGroup && bloodGroup !== "ALL") params.set("bloodGroup", bloodGroup);
    if (city) params.set("city", city);
    if (pincode) params.set("pincode", pincode);
    if (availableNow) params.set("availableNow", "true");

    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rose-50/70 via-white to-[#fcfbfb] pt-10 pb-16 sm:pt-16 sm:pb-24 border-b border-stone-200/60">
        {/* Subtle decorative background watermarks */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-rose-200/25 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-red-200/20 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
          {/* Top trust badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/90 px-3.5 py-1.5 shadow-xs backdrop-blur-xs text-xs sm:text-sm font-semibold text-red-900">
              <span className="flex h-2 w-2 rounded-full bg-red-700 animate-pulse" />
              <span>Voluntary Community Directory • Privacy by Default</span>
            </div>
          </div>

          {/* Heading and supporting text */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 leading-tight">
              Find a blood donor when{" "}
              <span className="bg-gradient-to-r from-red-800 via-rose-700 to-red-900 bg-clip-text text-transparent">
                every minute matters.
              </span>
            </h1>
            <p className="text-base sm:text-xl text-stone-600 leading-relaxed font-normal">
              BloodLink connects voluntary blood donors with individuals in need across Indian cities. Search verified availability with complete donor privacy—no phone numbers or emails are ever exposed publicly.
            </p>
          </div>

          {/* Critical Prominent Safety Disclaimer Banner */}
          <div className="max-w-4xl mx-auto">
            <SafetyDisclaimerBanner />
          </div>

          {/* Prominent Quick Search Form Card */}
          <div className="max-w-4xl mx-auto">
            <div className="rounded-3xl border border-stone-200/90 bg-white/95 p-5 sm:p-8 shadow-xl shadow-stone-200/50 backdrop-blur-md">
              <form onSubmit={handleSearchSubmit} className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      1. Select Blood Group Needed
                    </label>
                    <span className="text-xs text-red-800 font-semibold hidden sm:inline">
                      O- is Universal Donor
                    </span>
                  </div>

                  {/* Blood Group Grid Buttons */}
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {ALL_BLOOD_GROUPS.map((bg) => {
                      const isSelected = bloodGroup === bg;
                      return (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setBloodGroup(bg)}
                          className={`flex flex-col items-center justify-center h-13 sm:h-14 rounded-2xl font-black text-sm sm:text-base transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-red-800 text-white border-red-800 shadow-md shadow-red-900/30 scale-[1.03]"
                              : "bg-stone-50 text-stone-800 border-stone-200 hover:border-red-300 hover:bg-rose-50"
                          }`}
                        >
                          <Droplet className={`h-3.5 w-3.5 mb-0.5 ${isSelected ? "fill-white text-white" : "text-red-700"}`} />
                          {bg}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* City + PIN Code + Available Toggle in clean grid */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
                  <div className="sm:col-span-5">
                    <Select
                      label="2. City / Major Area"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    >
                      <option value="">All Indian Cities (Seeded)</option>
                      {cities.map((c) => (
                        <option key={c.city} value={c.city}>
                          {c.city} ({c.count} active donors)
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="sm:col-span-3">
                    <Input
                      label="3. PIN Code (Optional)"
                      placeholder="e.g. 560034"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      maxLength={6}
                    />
                  </div>

                  <div className="sm:col-span-4 flex items-center justify-between sm:justify-start gap-2 h-11 px-3 rounded-xl border border-stone-200 bg-stone-50/70">
                    <label htmlFor="hero-available" className="text-xs font-bold text-stone-700 cursor-pointer">
                      Available Now Only
                    </label>
                    <input
                      id="hero-available"
                      type="checkbox"
                      checked={availableNow}
                      onChange={(e) => setAvailableNow(e.target.checked)}
                      className="h-5 w-5 rounded-md border-stone-300 text-red-800 focus:ring-red-800 cursor-pointer accent-red-800 ml-auto"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Lock className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>Privacy Guarantee: Phone and email are never shown in public search.</span>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto px-8 gap-2 font-bold shadow-md shadow-red-900/25"
                  >
                    <Search className="h-5 w-5" />
                    Search Donors
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Two Strong Calls to Action */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/search" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-stone-800 font-bold border-stone-300 hover:bg-stone-50">
                <Search className="h-5 w-5 text-red-800" />
                Find a Donor
              </Button>
            </Link>

            <Link href="/register" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto gap-2 text-red-900 bg-rose-100 hover:bg-rose-200 font-bold">
                <HeartHandshake className="h-5 w-5 text-red-800" />
                Become a Voluntary Donor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Live Database Metrics & System Health */}
      <section className="py-12 bg-stone-900 text-white border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/80 border border-emerald-500/30 px-3.5 py-1 text-xs font-semibold text-emerald-400">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Database Connected • Real-Time Registration Active</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-rose-300">
                {dbStats ? dbStats.totalDonors : 0}
              </p>
              <p className="text-xs sm:text-sm font-medium text-stone-400">Registered Donors in DB</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-rose-300">
                {dbStats ? dbStats.availableDonors : 0}
              </p>
              <p className="text-xs sm:text-sm font-medium text-stone-400">Available Now</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-rose-300">8</p>
              <p className="text-xs sm:text-sm font-medium text-stone-400">All Blood Groups (ABO/Rh)</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl sm:text-4xl font-black text-rose-300">15+</p>
              <p className="text-xs sm:text-sm font-medium text-stone-400">AP & National Hospital Centres</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section className="py-16 sm:py-24 bg-white border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800">
              Simple 4-Step Process
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
              How BloodLink Works
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Designed for urgent moments, built with patient and donor privacy in mind at every phase.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="relative p-6 rounded-2xl border border-stone-200/90 bg-[#fbf9f9] space-y-4 hover:border-red-300 hover:shadow-sm transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-800 font-black text-lg">
                1
              </div>
              <h3 className="font-bold text-lg text-stone-900">Search Donors</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Filter voluntary donors by compatible blood group, city, locality, and real-time availability status.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative p-6 rounded-2xl border border-stone-200/90 bg-[#fbf9f9] space-y-4 hover:border-red-300 hover:shadow-sm transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-800 font-black text-lg">
                2
              </div>
              <h3 className="font-bold text-lg text-stone-900">Send Request</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Submit patient hospital details, required blood unit count, and urgency level via safe in-app dispatch.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative p-6 rounded-2xl border border-stone-200/90 bg-[#fbf9f9] space-y-4 hover:border-red-300 hover:shadow-sm transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-800 font-black text-lg">
                3
              </div>
              <h3 className="font-bold text-lg text-stone-900">Confirm Availability</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Donors review the medical facility request and independently confirm their current readiness to donate.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative p-6 rounded-2xl border border-stone-200/90 bg-[#fbf9f9] space-y-4 hover:border-red-300 hover:shadow-sm transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-800 font-black text-lg">
                4
              </div>
              <h3 className="font-bold text-lg text-stone-900">Coordinate at Hospital</h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Meet at the certified hospital blood bank for official cross-matching, clinical screening, and donation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Trust & Safety Section: Privacy-First Contact */}
      <section className="py-16 sm:py-20 bg-rose-50/50 border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-red-800">
                Privacy Architecture
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
                Your Contact Information Stays Protected. Always.
              </h2>
              <p className="text-sm sm:text-base text-stone-700 leading-relaxed">
                Unlike unmoderated WhatsApp groups or social media posts where personal numbers get scraped and spammed, BloodLink uses protected matchmaking.
              </p>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700">
                    <strong>Zero Public Contact Leaks:</strong> Phone numbers and emails are never exposed in public directory searches.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700">
                    <strong>Explicit Donor Consent:</strong> Contact information is shared only after the voluntary donor reviews and accepts an incoming request.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700">
                    <strong>Full Donor Control:</strong> Pause your listing anytime with one click, or set unavailable dates when resting between donations.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/privacy">
                  <Button variant="outline" size="md" className="gap-2 text-red-900 border-red-200 hover:bg-rose-100/50">
                    Read Complete Privacy Architecture <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Visual privacy preview card */}
            <div className="p-6 sm:p-8 rounded-3xl border border-stone-200 bg-white shadow-lg space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-emerald-700" />
                  <span className="font-bold text-sm text-stone-900">Public Search Card View</span>
                </div>
                <Badge variant="success" size="sm">Protected</Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-500 font-medium">Display Name</span>
                  <span className="font-bold text-stone-900">Arjun K. (First name + initial)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-500 font-medium">Location</span>
                  <span className="font-bold text-stone-900">Mumbai • Andheri (City/Area only)</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-500 font-medium">Phone Number</span>
                  <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    Hidden until request accepted
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100">
                  <span className="text-stone-500 font-medium">Email Address</span>
                  <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    Protected by RLS
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 text-[11px] text-stone-600 leading-relaxed">
                Supabase Row Level Security (RLS) ensures that the backend database refuses to serialize private columns to anonymous search queries.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Hospital & Blood Bank Centres in Andhra Pradesh & Nationally */}
      <section className="py-16 sm:py-20 bg-stone-50 border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-800">
                Hospital & Blood Bank Network
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
                Verified Blood Centres in Andhra Pradesh & Across India
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
                Coordinate with certified government medical colleges, autonomous institutes, and district blood banks in Visakhapatnam, Vijayawada, Guntur, Tirupati, Kurnool, Nellore, and major metros.
              </p>
            </div>

            <Link href="/blood-banks">
              <Button variant="outline" size="md" className="gap-2 font-bold text-red-800 border-red-200 hover:bg-rose-50">
                <Building2 className="h-4 w-4" />
                View All Centres Directory <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Vizag */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="crimson" size="sm">Visakhapatnam (AP)</Badge>
                <Badge variant="success" size="sm">24x7 Open</Badge>
              </div>
              <h3 className="font-bold text-stone-900 text-base">
                King George Hospital (KGH) Government Blood Bank
              </h3>
              <p className="text-xs text-stone-500">
                Maharanipeta, Collector Office Junction, Visakhapatnam – 530002
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-700 font-semibold">📞 +91 891 2564891</span>
                <Link href="/blood-banks?city=Visakhapatnam" className="text-red-800 font-bold hover:underline">
                  Details →
                </Link>
              </div>
            </div>

            {/* Vijayawada */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="crimson" size="sm">Vijayawada (AP)</Badge>
                <Badge variant="success" size="sm">24x7 Open</Badge>
              </div>
              <h3 className="font-bold text-stone-900 text-base">
                Government General Hospital (GGH) Blood Bank
              </h3>
              <p className="text-xs text-stone-500">
                Siddhartha Medical College Campus, Ring Road, Gunadala – 520008
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-700 font-semibold">📞 +91 866 2451234</span>
                <Link href="/blood-banks?city=Vijayawada" className="text-red-800 font-bold hover:underline">
                  Details →
                </Link>
              </div>
            </div>

            {/* Guntur */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="crimson" size="sm">Guntur (AP)</Badge>
                <Badge variant="success" size="sm">AIIMS Centre</Badge>
              </div>
              <h3 className="font-bold text-stone-900 text-base">
                AIIMS Mangalagiri Central Blood Centre
              </h3>
              <p className="text-xs text-stone-500">
                AIIMS Hospital Campus, Mangalagiri, Guntur District – 522503
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-700 font-semibold">📞 +91 8645 280000</span>
                <Link href="/blood-banks?city=Guntur" className="text-red-800 font-bold hover:underline">
                  Details →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Blood Compatibility Educational Section */}
      <section className="py-16 sm:py-24 bg-white border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800">
              Clinical Reference
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
              Blood Compatibility Matrix
            </h2>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
              Understand which blood groups can safely donate to or receive from each other.
            </p>
          </div>

          <BloodMatrix />
        </div>
      </section>

      {/* 6. Call to Action Banner */}
      <section className="py-16 bg-gradient-to-r from-red-900 via-rose-950 to-stone-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Be a Lifeline in Your Neighborhood.
          </h2>
          <p className="text-sm sm:text-base text-rose-200 max-w-2xl mx-auto leading-relaxed">
            One single blood donation can save up to three lives. Register your voluntary profile today and manage your availability at your own pace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/register">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto font-bold bg-white text-red-950 hover:bg-rose-50">
                Register as Voluntary Donor
              </Button>
            </Link>
            <Link href="/request-blood">
              <Button variant="outline" size="lg" className="w-full sm:w-auto font-bold text-white border-white/40 hover:bg-white/10">
                Submit a Blood Request
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
