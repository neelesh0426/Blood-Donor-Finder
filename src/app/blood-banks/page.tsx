"use client";

import * as React from "react";
import Link from "next/link";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  Search, 
  ShieldCheck, 
  Filter, 
  RotateCcw, 
  PlusCircle, 
  Droplet,
  Layers,
  Sparkles
} from "lucide-react";
import { HOSPITAL_AND_BLOOD_BANKS, ALL_STATES, ALL_CITIES_BY_STATE } from "@/lib/blood-banks-data";
import { HospitalBloodBank } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SafetyDisclaimerBanner } from "@/components/layout/safety-disclaimer-banner";

export default function BloodBanksPage() {
  const [selectedState, setSelectedState] = React.useState<string>("Andhra Pradesh");
  const [selectedCity, setSelectedCity] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [selectedComponent, setSelectedComponent] = React.useState<string>("ALL");

  const availableCities = selectedState && ALL_CITIES_BY_STATE[selectedState]
    ? ALL_CITIES_BY_STATE[selectedState]
    : [];

  const filteredCentres = React.useMemo(() => {
    return HOSPITAL_AND_BLOOD_BANKS.filter((centre) => {
      if (selectedState && selectedState !== "ALL" && centre.state !== selectedState) {
        return false;
      }
      if (selectedCity && centre.city !== selectedCity) {
        return false;
      }
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = centre.name.toLowerCase().includes(q);
        const matchesAddress = centre.address.toLowerCase().includes(q);
        const matchesCity = centre.city.toLowerCase().includes(q);
        const matchesPincode = centre.pincode.includes(q);
        if (!matchesName && !matchesAddress && !matchesCity && !matchesPincode) {
          return false;
        }
      }
      if (selectedComponent !== "ALL") {
        if (!centre.componentsAvailable.some((c) => c.toLowerCase().includes(selectedComponent.toLowerCase()))) {
          return false;
        }
      }
      return true;
    });
  }, [selectedState, selectedCity, searchQuery, selectedComponent]);

  const handleStateChange = (state: string) => {
    setSelectedState(state);
    setSelectedCity("");
  };

  const handleReset = () => {
    setSelectedState("ALL");
    setSelectedCity("");
    setSearchQuery("");
    setSelectedComponent("ALL");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Prominent Safety Disclaimer */}
      <SafetyDisclaimerBanner compact />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-bold text-red-900 mb-2">
            <Building2 className="h-4 w-4 text-red-800" />
            Verified Hospital & Blood Bank Network
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Hospital & Blood Bank Centres Directory
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Direct access to authorized government medical college blood banks, district hospital centres, and certified charitable blood banks across Andhra Pradesh and major Indian centres.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/request-blood">
            <Button variant="primary" size="md" className="gap-2 font-bold shadow-sm shadow-red-900/20">
              <PlusCircle className="h-4 w-4" />
              Create Blood Request
            </Button>
          </Link>
        </div>
      </div>

      {/* State Quick Tabs (Emphasizing Andhra Pradesh) */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
          Filter by State
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => handleStateChange("ALL")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
              selectedState === "ALL"
                ? "bg-red-800 text-white border-red-800 shadow-xs"
                : "bg-white text-stone-700 border-stone-200 hover:border-red-300 hover:bg-rose-50"
            }`}
          >
            All States
          </button>
          {ALL_STATES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => handleStateChange(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer ${
                selectedState === st
                  ? "bg-red-800 text-white border-red-800 shadow-xs"
                  : st === "Andhra Pradesh"
                  ? "bg-rose-50 text-red-900 border-rose-300 font-extrabold"
                  : "bg-white text-stone-700 border-stone-200 hover:border-red-300 hover:bg-rose-50"
              }`}
            >
              {st} {st === "Andhra Pradesh" ? "⭐" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
          <div className="sm:col-span-4">
            <Input
              label="Search Hospital / Blood Bank Name"
              placeholder="e.g. King George Hospital, SVIMS, AIIMS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              label="City / District"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              <option value="">All Cities in {selectedState === "ALL" ? "India" : selectedState}</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div className="sm:col-span-3">
            <Select
              label="Component Required"
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
            >
              <option value="ALL">All Blood Components</option>
              <option value="PRBC">Packed Red Blood Cells (PRBC)</option>
              <option value="Platelet">Platelets / SDP (Apheresis)</option>
              <option value="FFP">Fresh Frozen Plasma (FFP)</option>
              <option value="Whole Blood">Whole Blood</option>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Button
              variant="outline"
              size="md"
              onClick={handleReset}
              className="w-full gap-1.5 text-stone-600 text-xs font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>

        {/* Results Count Banner */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
          <span>
            Showing <strong>{filteredCentres.length}</strong> Hospital & Blood Bank Locations
          </span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" />
            Verified Government & Certified Facilities
          </span>
        </div>
      </div>

      {/* Centres Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredCentres.map((centre) => (
          <Card
            key={centre.id}
            className="hover:border-red-300 hover:shadow-md transition-all duration-200 border-stone-200 flex flex-col justify-between"
          >
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-800 to-red-950 text-white shadow-xs">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-stone-900 text-base leading-snug">
                        {centre.name}
                      </h3>
                    </div>
                    <p className="text-xs text-red-800 font-semibold">
                      {centre.type}
                    </p>
                  </div>
                </div>

                <Badge variant="success" size="sm" className="shrink-0 bg-emerald-50 text-emerald-800 border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Govt Certified
                </Badge>
              </div>

              {/* Location and Timings */}
              <div className="space-y-1.5 text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-stone-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {centre.address}, {centre.city}, {centre.state} – {centre.pincode}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60 text-stone-700 font-medium">
                  <Clock className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                  <span>{centre.operatingHours}</span>
                </div>
              </div>

              {/* Components Available */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Available Components
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {centre.componentsAvailable.map((comp) => (
                    <Badge
                      key={comp}
                      variant="neutral"
                      size="sm"
                      className="text-[10px] bg-white border-stone-300 font-medium"
                    >
                      <Droplet className="h-2.5 w-2.5 text-red-700" />
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Contact Actions Footer */}
              <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <a
                  href={`tel:${centre.phone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-2 text-stone-800 font-bold hover:text-red-800 transition-colors"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-red-800">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span>{centre.phone}</span>
                </a>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/request-blood?city=${encodeURIComponent(centre.city)}&hospital=${encodeURIComponent(centre.name)}`}
                    className="w-full sm:w-auto"
                  >
                    <Button size="sm" variant="primary" className="h-9 px-3 text-xs font-semibold w-full sm:w-auto">
                      Request Blood Here
                    </Button>
                  </Link>

                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(`${centre.name}, ${centre.city}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-300 text-stone-600 hover:text-red-800 hover:border-red-300 transition-colors"
                    aria-label={`Get directions to ${centre.name}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCentres.length === 0 && (
        <div className="text-center p-12 rounded-3xl border border-stone-200 bg-white space-y-4">
          <Building2 className="h-10 w-10 text-stone-400 mx-auto" />
          <h3 className="font-bold text-stone-900 text-lg">No Hospital Centres Found</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Try resetting your state or city filter to view blood bank locations across other districts.
          </p>
          <Button variant="outline" size="md" onClick={handleReset}>
            Reset Filters
          </Button>
        </div>
      )}

      {/* Emergency Resources Box */}
      <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-red-950 flex items-center gap-2">
          <Phone className="h-5 w-5 text-red-800" />
          National & Andhra Pradesh Blood Bank Helplines
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white border border-rose-200/80 space-y-1">
            <span className="font-black text-red-900 text-lg">104</span>
            <p className="font-semibold text-stone-900">AP Health & Blood Helpline</p>
            <p className="text-stone-500">24/7 Government blood availability consultation.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-rose-200/80 space-y-1">
            <span className="font-black text-red-900 text-lg">108</span>
            <p className="font-semibold text-stone-900">Emergency Ambulance</p>
            <p className="text-stone-500">Immediate patient transportation and trauma care.</p>
          </div>

          <a
            href="https://eraktkosh.mohfw.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-2xl bg-white border border-rose-200/80 space-y-1 hover:border-red-400 transition-colors block"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-900 text-sm">eRaktKosh Portal</span>
              <ExternalLink className="h-4 w-4 text-stone-400" />
            </div>
            <p className="text-stone-600">Central government live blood stock portal.</p>
          </a>
        </div>
      </div>
    </div>
  );
}
