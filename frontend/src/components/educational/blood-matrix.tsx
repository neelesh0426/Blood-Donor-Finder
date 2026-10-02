"use client";

import * as React from "react";
import { BloodGroup } from "@/types/database";
import { ALL_BLOOD_GROUPS, BLOOD_COMPATIBILITY_DATA, isDonorCompatible } from "@/lib/compatibility";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, X, Info, Droplet, ArrowRight, ShieldAlert } from "lucide-react";

export function BloodMatrix() {
  const [selectedGroup, setSelectedGroup] = React.useState<BloodGroup>("O+");
  const currentRule = BLOOD_COMPATIBILITY_DATA[selectedGroup];

  return (
    <div className="space-y-8">
      {/* Educational Notice Header */}
      <div className="flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-200/80 p-4 text-xs sm:text-sm text-red-950">
        <Info className="h-5 w-5 shrink-0 text-red-700 mt-0.5" />
        <div>
          <span className="font-bold">Educational Reference Only: </span>
          Actual cross-matching, antibody screening, and laboratory compatibility testing are mandated by law and must always be conducted by qualified blood bank pathologists before any transfusion.
        </div>
      </div>

      {/* Blood Group Selector Pills */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 text-center sm:text-left">
          Select a Blood Group to Inspect Compatibility
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {ALL_BLOOD_GROUPS.map((bg) => {
            const isSelected = selectedGroup === bg;
            return (
              <button
                key={bg}
                type="button"
                onClick={() => setSelectedGroup(bg)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-red-800 text-white border-red-800 shadow-md shadow-red-900/30 scale-105"
                    : "bg-white text-stone-800 border-stone-200 hover:border-red-300 hover:bg-rose-50"
                }`}
              >
                <Droplet className={`h-4 w-4 mb-1 ${isSelected ? "text-rose-200 fill-white" : "text-red-700"}`} />
                <span className="text-sm sm:text-base font-extrabold">{bg}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Group Detailed Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Can Donate To */}
        <Card className="border-stone-200 shadow-xs">
          <CardHeader className="bg-stone-50/80 border-b border-stone-100 rounded-t-2xl pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-800 text-xs font-black">
                  {selectedGroup}
                </span>
                Can Donate Red Cells To:
              </CardTitle>
              <Badge variant="crimson" size="sm">
                {currentRule.canDonateTo.length} Recipient Types
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Eligible recipient blood groups during packed red blood cell (PRBC) transfusions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-wrap gap-2.5">
              {ALL_BLOOD_GROUPS.map((target) => {
                const can = currentRule.canDonateTo.includes(target);
                return (
                  <div
                    key={target}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      can
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                        : "bg-stone-50 text-stone-400 border-stone-200 opacity-50"
                    }`}
                  >
                    {can ? (
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-stone-400 shrink-0" />
                    )}
                    <span>{target}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Can Receive From */}
        <Card className="border-stone-200 shadow-xs">
          <CardHeader className="bg-stone-50/80 border-b border-stone-100 rounded-t-2xl pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-red-800 text-xs font-black">
                  {selectedGroup}
                </span>
                Can Receive Red Cells From:
              </CardTitle>
              <Badge variant="crimson" size="sm">
                {currentRule.canReceiveFrom.length} Donor Types
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Compatible donor blood groups when a {selectedGroup} patient needs a transfusion.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="flex flex-wrap gap-2.5">
              {ALL_BLOOD_GROUPS.map((source) => {
                const can = currentRule.canReceiveFrom.includes(source);
                return (
                  <div
                    key={source}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      can
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                        : "bg-stone-50 text-stone-400 border-stone-200 opacity-50"
                    }`}
                  >
                    {can ? (
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-stone-400 shrink-0" />
                    )}
                    <span>{source}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Biological Facts Banner */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 space-y-4">
        <h4 className="font-bold text-stone-900 text-base">
          Clinical Profile for Blood Group {selectedGroup}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70">
            <span className="text-stone-500 font-semibold block uppercase">Antigens on Red Cells</span>
            <span className="text-stone-900 font-bold text-sm mt-0.5 block">{currentRule.antigens}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70">
            <span className="text-stone-500 font-semibold block uppercase">Antibodies in Plasma</span>
            <span className="text-stone-900 font-bold text-sm mt-0.5 block">{currentRule.antibodies}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70">
            <span className="text-stone-500 font-semibold block uppercase">Population Frequency (Est.)</span>
            <span className="text-stone-900 font-bold text-sm mt-0.5 block">{currentRule.populationFrequency}</span>
          </div>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed pt-1">
          <strong>Clinical Note:</strong> {currentRule.note}
        </p>
      </div>

      {/* Complete Cross-Reference Table */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/70">
          <h4 className="font-bold text-stone-900 text-sm sm:text-base">
            Complete ABO & Rh Compatibility Matrix
          </h4>
          <p className="text-xs text-stone-500">
            Rows represent Donors; Columns represent Recipients.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead className="bg-stone-100/70 text-stone-700 font-bold border-b border-stone-200">
              <tr>
                <th className="p-3 text-left font-bold text-stone-900">Donor \ Recipient</th>
                {ALL_BLOOD_GROUPS.map((rec) => (
                  <th key={rec} className="p-3 font-extrabold text-stone-900">
                    {rec}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {ALL_BLOOD_GROUPS.map((donor) => {
                const isCurrent = donor === selectedGroup;
                return (
                  <tr
                    key={donor}
                    className={isCurrent ? "bg-rose-50/70 font-semibold" : "hover:bg-stone-50"}
                  >
                    <td className="p-3 text-left font-black text-stone-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-700 inline-block" />
                      {donor}
                    </td>
                    {ALL_BLOOD_GROUPS.map((recipient) => {
                      const compatible = isDonorCompatible(donor, recipient);
                      return (
                        <td key={recipient} className="p-3">
                          {compatible ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="inline-flex h-6 w-6 items-center justify-center text-stone-300">
                              -
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
