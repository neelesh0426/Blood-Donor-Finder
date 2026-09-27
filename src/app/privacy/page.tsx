import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { SafetyDisclaimerBanner } from "@/components/layout/safety-disclaimer-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Lock, Eye, Trash2, Database, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | BloodLink",
  description:
    "Learn about our privacy-first architecture, how donor phone numbers and emails are protected, and your complete data rights.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Prominent Safety Disclaimer */}
      <SafetyDisclaimerBanner />

      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 text-emerald-900 px-3 py-1 text-xs font-bold">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          Privacy-First Architecture
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
          BloodLink Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          Effective Date: September 2026 • Version 1.0 (Informational Directory)
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
        <section className="p-6 rounded-2xl border border-stone-200 bg-white space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-stone-900">
            1. Our Fundamental Privacy Commitment
          </h2>
          <p>
            Blood donation is an act of pure voluntary altruism. In response to widespread harassment and unsolicited spam from public WhatsApp groups and unsecured web boards, BloodLink was engineered with <strong>protected matchmaking</strong> at its core.
          </p>
          <p className="font-semibold text-stone-900">
            We will never sell, lease, or monetize donor personal contact information to pharmaceutical companies, insurance providers, or marketing aggregators.
          </p>
        </section>

        <section className="p-6 rounded-2xl border border-stone-200 bg-white space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <Lock className="h-5 w-5 text-emerald-700" />
            2. Public Search Fields vs. Protected Fields
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <span className="font-bold text-stone-900 block text-xs uppercase tracking-wider text-emerald-800">
                Visible in Public Directory
              </span>
              <ul className="space-y-1 list-disc list-inside text-stone-600 text-xs">
                <li>Pseudonym / First Name & Initial (e.g., &ldquo;Arjun K.&rdquo;)</li>
                <li>Blood Group (e.g., &ldquo;O+&rdquo;)</li>
                <li>City & Locality (e.g., &ldquo;Mumbai • Andheri&rdquo;)</li>
                <li>Availability Status (Available Now / Resting)</li>
                <li>Verified flags (Phone verified / Email verified)</li>
                <li>Recent active timestamp</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <span className="font-bold text-stone-900 block text-xs uppercase tracking-wider text-red-800">
                Encrypted & Strictly Protected
              </span>
              <ul className="space-y-1 list-disc list-inside text-stone-600 text-xs">
                <li>Primary Mobile Phone Number</li>
                <li>Email Address</li>
                <li>Account Password / Auth Tokens</li>
                <li>Exact Residential Street Address / Flat Number</li>
                <li>Personal Identity Documents</li>
              </ul>
            </div>
          </div>

          <p className="text-xs text-stone-600">
            Supabase Row Level Security (RLS) is configured at the database engine level so that unauthorized queries are technically prevented from serializing protected columns.
          </p>
        </section>

        <section className="p-6 rounded-2xl border border-stone-200 bg-white space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-stone-900">
            3. Two-Way Consent Exchange
          </h2>
          <p>
            When a patient or hospital caretaker posts an emergency blood request:
          </p>
          <ol className="space-y-2 list-decimal list-inside text-stone-600 pl-2">
            <li>The system notifies candidate compatible donors in that city via in-app dashboard.</li>
            <li>The donor inspects the hospital name, city area, and urgency.</li>
            <li><strong>Protected contact information is only made accessible if the voluntary donor explicitly clicks &ldquo;Accept Request&rdquo;.</strong></li>
            <li>If the donor declines or is resting, zero contact details are transmitted.</li>
          </ol>
        </section>

        <section className="p-6 rounded-2xl border border-stone-200 bg-white space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-800" />
            4. Your Complete Data Rights
          </h2>
          <p>
            As a voluntary donor, you maintain complete sovereignty over your profile:
          </p>
          <ul className="space-y-1.5 list-disc list-inside text-stone-600 pl-2">
            <li><strong>Pause Listing:</strong> Temporarily hide yourself from public search results anytime with one click in your dashboard.</li>
            <li><strong>Set Rest Dates:</strong> Mark yourself unavailable until a specified recovery date after donation.</li>
            <li><strong>Permanent Deletion:</strong> You can delete your profile, credentials, and listing permanently from your dashboard at any time.</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border border-stone-200 bg-white space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-stone-900">
            5. Contact Privacy Questions
          </h2>
          <p>
            If you have questions regarding data retention, security disclosures, or account assistance, please contact the BloodLink privacy team at <strong className="text-stone-900">privacy@bloodlink.demo</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
