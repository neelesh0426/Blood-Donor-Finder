import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { SafetyDisclaimerBanner } from "@/components/layout/safety-disclaimer-banner";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, AlertTriangle, ShieldCheck, Scale, Ban } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | BloodLink",
  description:
    "Read the terms of service, non-commercial blood donation policies, and legal limitation of service for the BloodLink directory.",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Prominent Safety Disclaimer */}
      <SafetyDisclaimerBanner />

      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-xl bg-stone-100 text-stone-900 px-3 py-1 text-xs font-bold">
          <Scale className="h-4 w-4 text-stone-700" />
          Community Terms & Limitations
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
          BloodLink Terms of Service
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          Last Updated: September 2026 • Informational Voluntary Directory
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
        {/* Section 1: Non-Emergency Disclaimer */}
        <section className="p-6 rounded-2xl border border-stone-200 bg-white space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-800" />
            1. Informational Directory Only — Not an Emergency Service
          </h2>
          <p>
            BloodLink is exclusively an informational directory service intended to facilitate voluntary community coordination. <strong>BloodLink is NOT a medical facility, hospital, blood bank, ambulance dispatch, or emergency rescue service.</strong>
          </p>
          <p>
            If a patient is experiencing an acute medical emergency, trauma, hemorrhage, or critical deterioration, caregivers must immediately dial national emergency medical response (108 / 112) and report directly to an authorized hospital blood bank.
          </p>
        </section>

        {/* Section 2: Non-Commercial Policy */}
        <section className="p-6 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-red-950 flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-800" />
            2. Strict Prohibition on Commercial Blood Trade
          </h2>
          <p className="font-semibold text-stone-900">
            In compliance with the National Blood Policy of India and the Supreme Court of India rulings, the buying, selling, or offering of financial consideration for human blood or blood components is strictly illegal and prohibited.
          </p>
          <p className="text-stone-700">
            Any user found demanding payment, arranging paid donors, or soliciting brokerage fees will face immediate account termination and reporting to competent civil and law enforcement authorities.
          </p>
        </section>

        {/* Section 3: Clinical Verification */}
        <section className="p-6 rounded-2xl border border-stone-200 bg-white space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-stone-900">
            3. Mandatory Hospital Clinical Screening
          </h2>
          <p>
            BloodLink cannot and does not certify or guarantee the medical eligibility, infectious disease status, or biological compatibility of any registered voluntary donor.
          </p>
          <p>
            The donor, recipient, attending physician, and hospital blood bank pathologist are solely responsible for conducting mandatory preliminary donor screening, hemoglobin evaluation, vital checks, and serological cross-matching before any donation or transfusion.
          </p>
        </section>

        {/* Section 4: Limitation of Liability */}
        <section className="p-6 rounded-2xl border border-stone-200 bg-white space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-stone-900">
            4. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted under applicable law, BloodLink, its volunteer contributors, and operators shall not be liable for any direct, indirect, incidental, consequential, or medical damages arising out of the availability, non-availability, actions, or omissions of voluntary donors or recipients.
          </p>
        </section>

        {/* Section 5: Responsible Community Conduct */}
        <section className="p-6 rounded-2xl border border-stone-200 bg-white space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-stone-900">
            5. Community Code of Conduct
          </h2>
          <ul className="space-y-1.5 list-disc list-inside text-stone-600 pl-2">
            <li>Users must provide truthful hospital and contact details in blood requests.</li>
            <li>Spamming, broadcasting duplicate fraudulent requests, or harassing voluntary donors is grounds for permanent exclusion.</li>
            <li>Voluntary donors are under no legal obligation to donate and may decline requests according to their personal health and readiness.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
