"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PublicDonorCard } from "@/types/database";
import { donorStore, SearchDonorParams } from "@/lib/donor-store";
import { DonorCard } from "@/components/donor/donor-card";
import { DonorFilter, FilterValues } from "@/components/donor/donor-filter";
import { DonorRequestModal } from "@/components/donor/donor-request-modal";
import { NotifyModal } from "@/components/donor/notify-modal";
import { ReportModal } from "@/components/donor/report-modal";
import { SafetyDisclaimerBanner } from "@/components/layout/safety-disclaimer-banner";
import { CLINICAL_SAFETY_DISCLAIMER } from "@/lib/cooldown";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";
import { 
  Search, 
  SlidersHorizontal, 
  RotateCcw, 
  PlusCircle, 
  ExternalLink, 
  PhoneCall, 
  AlertCircle, 
  Building2,
  Lock,
  X,
  Sparkles,
  ShieldAlert,
  Bell
} from "lucide-react";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL query params
  const initialGroup = searchParams.get("bloodGroup") || "ALL";
  const initialState = searchParams.get("state") || "ALL";
  const initialCity = searchParams.get("city") || "";
  const initialPincode = searchParams.get("pincode") || "";
  const initialAvailable = searchParams.get("availableNow") === "true";
  const initialEligibility = searchParams.get("eligibility") || "ALL";
  const initialVerified = searchParams.get("verifiedOnly") === "true";

  const [filterValues, setFilterValues] = React.useState<FilterValues>({
    bloodGroup: initialGroup,
    state: initialState,
    city: initialCity,
    pincode: initialPincode,
    availableNow: initialAvailable,
    eligibility: initialEligibility,
    verifiedOnly: initialVerified,
  });

  const [cities, setCities] = React.useState<Array<{ city: string; count: number }>>([]);
  const [results, setResults] = React.useState<PublicDonorCard[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [visibleCount, setVisibleCount] = React.useState(8);
  const [selectedDonorForRequest, setSelectedDonorForRequest] = React.useState<PublicDonorCard | null>(null);
  const [selectedDonorForNotify, setSelectedDonorForNotify] = React.useState<PublicDonorCard | null>(null);
  const [selectedDonorForReport, setSelectedDonorForReport] = React.useState<PublicDonorCard | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);

  // Sync state with URL params
  React.useEffect(() => {
    setFilterValues({
      bloodGroup: searchParams.get("bloodGroup") || "ALL",
      state: searchParams.get("state") || "ALL",
      city: searchParams.get("city") || "",
      pincode: searchParams.get("pincode") || "",
      availableNow: searchParams.get("availableNow") === "true",
      eligibility: searchParams.get("eligibility") || "ALL",
      verifiedOnly: searchParams.get("verifiedOnly") === "true",
    });
  }, [searchParams]);

  // Load cities list
  // Load cities list from live database
  const refreshCities = React.useCallback(async () => {
    try {
      const res = await fetch("/api/donors", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.donors && Array.isArray(data.donors)) {
          const map: Record<string, number> = {};
          for (const d of data.donors) {
            if (d.city) map[d.city] = (map[d.city] || 0) + 1;
          }
          setCities(Object.entries(map).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count));
          return;
        }
      }
    } catch {}
    setCities(donorStore.getCitiesWithCounts());
  }, []);

  React.useEffect(() => {
    refreshCities();
  }, [refreshCities]);

  // Execute search whenever filters change against live database
  const executeSearch = React.useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams();
      if (filterValues.bloodGroup && filterValues.bloodGroup !== "ALL") {
        params.set("bloodGroup", filterValues.bloodGroup);
      }
      if (filterValues.state && filterValues.state !== "ALL") {
        params.set("state", filterValues.state);
      }
      if (filterValues.city) params.set("city", filterValues.city);
      if (filterValues.pincode) params.set("pincode", filterValues.pincode);
      if (filterValues.availableNow) params.set("availability", "available_now");
      if (filterValues.eligibility && filterValues.eligibility !== "ALL") {
        params.set("eligibility", filterValues.eligibility);
      }
      if (filterValues.verifiedOnly) params.set("verifiedOnly", "true");

      const res = await fetch(`/api/donors?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.donors)) {
          setResults(data.donors);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Live API search fetch error, falling back to local store:", e);
    }

    const searchParamsObj: SearchDonorParams = {
      bloodGroup: filterValues.bloodGroup,
      state: filterValues.state,
      city: filterValues.city,
      pincode: filterValues.pincode,
      availableNow: filterValues.availableNow,
      eligibility: filterValues.eligibility,
      verifiedOnly: filterValues.verifiedOnly,
    };

    const found = donorStore.searchPublicDonors(searchParamsObj);
    setResults(found);
    setIsLoading(false);
  }, [filterValues]);

  React.useEffect(() => {
    executeSearch();

    const handleUpdate = () => {
      executeSearch();
      refreshCities();
    };
    window.addEventListener("bloodlink_store_updated", handleUpdate);
    return () => window.removeEventListener("bloodlink_store_updated", handleUpdate);
  }, [executeSearch, refreshCities]);

  const updateFilters = (newValues: FilterValues) => {
    setFilterValues(newValues);
    setVisibleCount(8);

    // Update URL params
    const params = new URLSearchParams();
    if (newValues.bloodGroup && newValues.bloodGroup !== "ALL") {
      params.set("bloodGroup", newValues.bloodGroup);
    }
    if (newValues.state && newValues.state !== "ALL") {
      params.set("state", newValues.state);
    }
    if (newValues.city) params.set("city", newValues.city);
    if (newValues.pincode) params.set("pincode", newValues.pincode);
    if (newValues.availableNow) params.set("availableNow", "true");
    if (newValues.eligibility && newValues.eligibility !== "ALL") {
      params.set("eligibility", newValues.eligibility);
    }
    if (newValues.verifiedOnly) params.set("verifiedOnly", "true");

    const queryString = params.toString();
    router.replace(`/search${queryString ? `?${queryString}` : ""}`);
  };

  const handleResetFilters = () => {
    const resetVals: FilterValues = {
      bloodGroup: "ALL",
      state: "ALL",
      city: "",
      pincode: "",
      availableNow: false,
      eligibility: "ALL",
      verifiedOnly: false,
    };
    updateFilters(resetVals);
  };

  const visibleResults = results.slice(0, visibleCount);
  const hasMore = visibleCount < results.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Prominent Safety Disclaimer */}
      <SafetyDisclaimerBanner compact />

      {/* Search Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2.5">
            <Search className="h-7 w-7 text-red-800" />
            Voluntary Donor Directory
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Privacy-safe voluntary blood donors across verified Indian locations.
          </p>
        </div>

        {/* Mobile Filter Toggle Button */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <Button
            variant="outline"
            size="md"
            onClick={() => setMobileDrawerOpen(true)}
            className="w-full sm:w-auto gap-2 font-bold"
          >
            <SlidersHorizontal className="h-4 w-4 text-red-800" />
            Filter Donors
            {results.length > 0 && (
              <Badge variant="crimson" size="sm">
                {results.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Main Grid: Left filters (desktop) + Right results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Desktop Left-side Filters */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-24 rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <DonorFilter
            values={filterValues}
            onChange={updateFilters}
            onReset={handleResetFilters}
            cities={cities}
            totalMatches={results.length}
          />
        </aside>

        {/* Mobile Drawer (Modal Filter Sheet) */}
        <Modal
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          title="Filter Voluntary Donors"
          size="sm"
        >
          <DonorFilter
            values={filterValues}
            onChange={updateFilters}
            onReset={handleResetFilters}
            cities={cities}
            totalMatches={results.length}
            isMobileDrawer
            onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
          />
        </Modal>

        {/* Right-side Results Container */}
        <div className="lg:col-span-8 space-y-5">
          {/* Quick Eligibility Toggle Tabs & Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
            <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl">
              <button
                type="button"
                onClick={() => updateFilters({ ...filterValues, eligibility: "LIKELY_ELIGIBLE" })}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterValues.eligibility === "LIKELY_ELIGIBLE"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Likely eligible now
              </button>
              <button
                type="button"
                onClick={() => updateFilters({ ...filterValues, eligibility: "ALL" })}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterValues.eligibility === "ALL" || !filterValues.eligibility
                    ? "bg-white text-red-900 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                All matching donors
              </button>
            </div>

            <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>{results.length} Donor{results.length !== 1 ? "s" : ""} Found</span>
            </div>
          </div>

          {/* Clinical Confirmation Notice */}
          <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-3 text-xs text-amber-950 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>Medical Disclaimer:</strong> {CLINICAL_SAFETY_DISCLAIMER} Voluntary availability guides are informational only.
            </p>
          </div>

          {/* Anti-Scam & Trust Warning */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-stone-800 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-red-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-snug">
              <strong className="text-red-950 font-bold">Anti-Scam Alert:</strong> BloodLink voluntary donation is strictly free. We never sell blood or request fees/advance payments. If anyone solicits money, please report them using the flag icon on their card immediately.
            </div>
          </div>

          {/* Active Filter Pills Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-stone-100/70 p-3 rounded-xl border border-stone-200/70">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-stone-700">
                {isLoading ? "Searching..." : `${results.length} Voluntary Donor${results.length !== 1 ? "s" : ""} Found`}
              </span>

              {filterValues.bloodGroup && filterValues.bloodGroup !== "ALL" && (
                <Badge variant="crimson" size="sm" className="gap-1">
                  Group: {filterValues.bloodGroup}
                  <button
                    onClick={() => updateFilters({ ...filterValues, bloodGroup: "ALL" })}
                    className="hover:text-rose-200 ml-0.5 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filterValues.state && filterValues.state !== "ALL" && (
                <Badge variant="default" size="sm" className="gap-1 bg-rose-50 text-red-900 border-rose-300 font-bold">
                  State: {filterValues.state}
                  <button
                    onClick={() => updateFilters({ ...filterValues, state: "ALL" })}
                    className="hover:text-red-700 ml-0.5 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filterValues.city && (
                <Badge variant="default" size="sm" className="gap-1 bg-white border-stone-300">
                  City: {filterValues.city}
                  <button
                    onClick={() => updateFilters({ ...filterValues, city: "" })}
                    className="hover:text-red-700 ml-0.5 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filterValues.availableNow && (
                <Badge variant="success" size="sm" className="gap-1">
                  Available Now
                  <button
                    onClick={() => updateFilters({ ...filterValues, availableNow: false })}
                    className="hover:text-emerald-950 ml-0.5 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filterValues.eligibility && filterValues.eligibility !== "ALL" && (
                <Badge
                  variant={filterValues.eligibility === "Eligible" ? "success" : "warning"}
                  size="sm"
                  className="gap-1"
                >
                  Status: {filterValues.eligibility}
                  <button
                    onClick={() => updateFilters({ ...filterValues, eligibility: "ALL" })}
                    className="hover:opacity-75 ml-0.5 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {filterValues.verifiedOnly && (
                <Badge variant="default" size="sm" className="gap-1 bg-white border-stone-300">
                  Verified Only
                  <button
                    onClick={() => updateFilters({ ...filterValues, verifiedOnly: false })}
                    className="hover:text-red-700 ml-0.5 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>

            {(filterValues.bloodGroup !== "ALL" ||
              filterValues.city ||
              filterValues.pincode ||
              filterValues.availableNow ||
              (filterValues.eligibility && filterValues.eligibility !== "ALL") ||
              filterValues.verifiedOnly) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-red-800 hover:text-red-950 font-bold transition-colors cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Results Grid or Skeleton Loading */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-5 rounded-2xl border border-stone-200 bg-white space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-2xl" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            /* No Results State with helpful next steps */
            <div className="p-8 sm:p-12 text-center rounded-3xl border border-stone-200 bg-white space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-red-800">
                <AlertCircle className="h-8 w-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-xl font-bold text-stone-900">
                  No matching donors in this area
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  We currently have no voluntary donors registered matching{" "}
                  <strong>{filterValues.bloodGroup !== "ALL" ? filterValues.bloodGroup : "your criteria"}</strong> in{" "}
                  <strong>{filterValues.city || "this city"}</strong>.
                </p>
              </div>

              {/* Actions: Register Donor or Request Blood */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/register">
                  <Button variant="primary" size="md" className="gap-2 font-bold w-full sm:w-auto shadow-sm">
                    <PlusCircle className="h-4 w-4" />
                    Register as Voluntary Donor
                  </Button>
                </Link>

                <Link href={`/request-blood?bloodGroup=${filterValues.bloodGroup !== "ALL" ? filterValues.bloodGroup : "O+"}&city=${encodeURIComponent(filterValues.city)}`}>
                  <Button variant="outline" size="md" className="gap-2 font-bold w-full sm:w-auto">
                    Register a Blood Request
                  </Button>
                </Link>

                <Button variant="ghost" size="md" onClick={handleResetFilters} className="w-full sm:w-auto text-xs text-stone-500">
                  Reset Search Filters
                </Button>
              </div>

              {/* Action 2: Official Blood Centres Links */}
              <div className="pt-6 border-t border-stone-100 max-w-lg mx-auto text-left space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Official Blood Centre Emergency Resources:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <a
                    href="https://eraktkosh.mohfw.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl border border-stone-200 hover:border-red-300 hover:bg-rose-50/50 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-bold text-stone-900">eRaktKosh Govt. Portal</p>
                      <p className="text-[11px] text-stone-500">Real-time blood bank inventory</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-stone-400 shrink-0" />
                  </a>

                  <div className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-800 font-bold shrink-0">
                      104
                    </span>
                    <div>
                      <p className="font-bold text-stone-900">Health Helpline</p>
                      <p className="text-[11px] text-stone-500">Toll-free state blood bank assistance</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Results Cards */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visibleResults.map((donor) => (
                  <DonorCard
                    key={donor.id}
                    donor={donor}
                    onRequestClick={(d) => setSelectedDonorForRequest(d)}
                    onNotifyClick={(d) => setSelectedDonorForNotify(d)}
                    onReportClick={(d) => setSelectedDonorForReport(d)}
                  />
                ))}
              </div>

              {/* Pagination / Load More */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setVisibleCount((prev) => prev + 6)}
                    className="font-bold"
                  >
                    Load More Donors ({results.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Request Dispatch Modal */}
      <DonorRequestModal
        donor={selectedDonorForRequest}
        isOpen={Boolean(selectedDonorForRequest)}
        onClose={() => setSelectedDonorForRequest(null)}
      />

      {/* Notify When Eligible Modal */}
      <NotifyModal
        donor={selectedDonorForNotify}
        isOpen={Boolean(selectedDonorForNotify)}
        onClose={() => setSelectedDonorForNotify(null)}
      />

      {/* Trust & Safety Report Modal */}
      {selectedDonorForReport && (
        <ReportModal
          isOpen={Boolean(selectedDonorForReport)}
          onClose={() => setSelectedDonorForReport(null)}
          targetType="donor"
          targetId={selectedDonorForReport.id}
          targetName={selectedDonorForReport.display_name}
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-center space-y-4">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-96 w-full max-w-4xl mx-auto rounded-3xl" />
        </div>
      }
    >
      <SearchContent />
    </React.Suspense>
  );
}
