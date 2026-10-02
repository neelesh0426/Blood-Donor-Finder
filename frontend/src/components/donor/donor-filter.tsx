"use client";

import * as React from "react";
import { ALL_BLOOD_GROUPS } from "@/lib/compatibility";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Filter, 
  RotateCcw, 
  CheckCircle, 
  Sparkles, 
  Search, 
  X, 
  SlidersHorizontal 
} from "lucide-react";

export interface FilterValues {
  bloodGroup: string;
  state?: string;
  city: string;
  pincode: string;
  availableNow: boolean;
  eligibility?: string;
  verifiedOnly: boolean;
}

export interface DonorFilterProps {
  values: FilterValues;
  onChange: (newValues: FilterValues) => void;
  onReset: () => void;
  cities: Array<{ city: string; count: number }>;
  totalMatches: number;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export function DonorFilter({
  values,
  onChange,
  onReset,
  cities,
  totalMatches,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}: DonorFilterProps) {
  const hasActiveFilters = Boolean(
    (values.bloodGroup && values.bloodGroup !== "ALL") ||
    (values.state && values.state !== "ALL") ||
    values.city ||
    values.pincode ||
    values.availableNow ||
    (values.eligibility && values.eligibility !== "ALL") ||
    values.verifiedOnly
  );

  const handleGroupSelect = (bg: string) => {
    onChange({
      ...values,
      bloodGroup: values.bloodGroup === bg ? "ALL" : bg,
    });
  };

  const content = (
    <div className="space-y-6 text-left">
      {/* Header with match count & reset */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-red-800" />
          <h3 className="font-bold text-stone-900 text-sm tracking-tight uppercase">
            Filter Donors
          </h3>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-semibold text-red-800 hover:text-red-950 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            Reset all
          </button>
        )}
      </div>

      {/* Blood Group Quick Pills */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
          Blood Group
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {ALL_BLOOD_GROUPS.map((bg) => {
            const isSelected = values.bloodGroup === bg;
            return (
              <button
                key={bg}
                type="button"
                onClick={() => handleGroupSelect(bg)}
                className={`flex h-10 items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-red-800 text-white border-red-800 shadow-sm shadow-red-900/20 scale-[1.02]"
                    : "bg-white text-stone-800 border-stone-200 hover:border-red-300 hover:bg-rose-50/50"
                }`}
              >
                {bg}
              </button>
            );
          })}
        </div>
        {values.bloodGroup && values.bloodGroup !== "ALL" && (
          <p className="text-[11px] text-stone-500 italic">
            Filtering for <span className="font-bold text-red-800">{values.bloodGroup}</span> donors
          </p>
        )}
      </div>

      {/* State Filter (with Andhra Pradesh highlight) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
          State / Region
        </label>
        <Select
          value={values.state || "ALL"}
          onChange={(e) => onChange({ ...values, state: e.target.value, city: "" })}
        >
          <option value="ALL">All States in India</option>
          <option value="Andhra Pradesh">Andhra Pradesh ⭐</option>
          <option value="Telangana">Telangana</option>
          <option value="Karnataka">Karnataka</option>
          <option value="Maharashtra">Maharashtra</option>
          <option value="Tamil Nadu">Tamil Nadu</option>
          <option value="Delhi NCR">Delhi NCR</option>
          <option value="West Bengal">West Bengal</option>
          <option value="Gujarat">Gujarat</option>
          <option value="Rajasthan">Rajasthan</option>
          <option value="Kerala">Kerala</option>
        </Select>
      </div>

      {/* City Select or input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
          City / District
        </label>
        <div className="relative">
          <Select
            value={values.city}
            onChange={(e) => onChange({ ...values, city: e.target.value })}
          >
            <option value="">All Cities ({cities.reduce((sum, c) => sum + c.count, 0)} Donors)</option>
            {cities.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city} ({c.count} active)
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* PIN Code Input */}
      <div className="space-y-1.5">
        <Input
          label="PIN Code (Optional)"
          placeholder="e.g. 560034 or 400053"
          value={values.pincode}
          onChange={(e) => onChange({ ...values, pincode: e.target.value })}
          maxLength={6}
        />
      </div>

      {/* Donation Eligibility / Cooldown Status Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
          Eligibility Filter
        </label>
        <Select
          value={values.eligibility || "ALL"}
          onChange={(e) => onChange({ ...values, eligibility: e.target.value })}
        >
          <option value="ALL">All matching donors</option>
          <option value="LIKELY_ELIGIBLE">Likely eligible now</option>
          <option value="ON_COOLDOWN">On cooldown</option>
          <option value="REQUIRES_REVIEW">Requires review</option>
        </Select>
      </div>

      {/* Toggles: Available Now & Verified Only */}
      <div className="space-y-3 pt-1 border-t border-stone-100">
        <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 cursor-pointer transition-colors">
          <div className="space-y-0.5 pr-2">
            <span className="text-xs font-bold text-stone-900 block">
              Available Now Only
            </span>
            <span className="text-[11px] text-stone-500 block leading-tight">
              Ready to coordinate today
            </span>
          </div>
          <input
            type="checkbox"
            checked={values.availableNow}
            onChange={(e) => onChange({ ...values, availableNow: e.target.checked })}
            className="h-5 w-5 rounded-md border-stone-300 text-red-800 focus:ring-red-800 cursor-pointer accent-red-800"
          />
        </label>

        <label className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 cursor-pointer transition-colors">
          <div className="space-y-0.5 pr-2">
            <span className="text-xs font-bold text-stone-900 block">
              Verified Donors Only
            </span>
            <span className="text-[11px] text-stone-500 block leading-tight">
              Phone or email verified
            </span>
          </div>
          <input
            type="checkbox"
            checked={values.verifiedOnly}
            onChange={(e) => onChange({ ...values, verifiedOnly: e.target.checked })}
            className="h-5 w-5 rounded-md border-stone-300 text-red-800 focus:ring-red-800 cursor-pointer accent-red-800"
          />
        </label>
      </div>

      {/* Mobile Drawer Bottom Close CTA */}
      {isMobileDrawer && (
        <div className="pt-4 border-t border-stone-200">
          <Button
            variant="primary"
            size="lg"
            className="w-full font-bold"
            onClick={onCloseMobileDrawer}
          >
            Show {totalMatches} Result{totalMatches !== 1 ? "s" : ""}
          </Button>
        </div>
      )}
    </div>
  );

  return content;
}
