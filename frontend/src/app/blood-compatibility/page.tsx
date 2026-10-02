import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { BloodMatrix } from "@/components/educational/blood-matrix";
import { SafetyDisclaimerBanner } from "@/components/layout/safety-disclaimer-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Droplet, ArrowRight, ShieldAlert, Sparkles, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Blood Compatibility Chart | BloodLink",
  description:
    "Interactive ABO and Rh blood group compatibility matrix and educational reference for red blood cell donations.",
};

export default function BloodCompatibilityPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Prominent Safety Disclaimer */}
      <SafetyDisclaimerBanner />

      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-red-800">
          <Layers className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
          Blood Group Compatibility Chart
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          Interactive educational tool illustrating how antigens and antibodies determine compatibility between blood donors and recipients.
        </p>
      </div>

      {/* Main Interactive Matrix */}
      <section>
        <BloodMatrix />
      </section>

      {/* Educational Deep Dive */}
      <section className="space-y-6 pt-4">
        <h2 className="text-xl font-bold text-stone-900">
          Understanding the Science of Blood Matching
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-stone-200">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Droplet className="h-5 w-5 text-red-800" />
                The ABO Grouping System
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-stone-600 space-y-2 leading-relaxed">
              <p>
                Human red blood cells can carry two major sugar antigens on their surface: <strong>Antigen A</strong> and <strong>Antigen B</strong>.
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Group A:</strong> Has A antigens; carries Anti-B antibodies in plasma.</li>
                <li><strong>Group B:</strong> Has B antigens; carries Anti-A antibodies in plasma.</li>
                <li><strong>Group AB:</strong> Has both A and B antigens; carries no ABO antibodies.</li>
                <li><strong>Group O:</strong> Has neither A nor B antigens; carries both Anti-A and Anti-B antibodies.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-red-800" />
                The Rh (Rhesus) Factor (+ / -)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-stone-600 space-y-2 leading-relaxed">
              <p>
                The <strong>Rh (D) antigen</strong> determines whether your blood is positive (+) or negative (-).
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Rh Positive (85-95% in India):</strong> Carries the D protein. Can safely receive both Rh+ and Rh- red cells.</li>
                <li><strong>Rh Negative (5-15% in India):</strong> Lacks the D protein. Must receive Rh- red cells to avoid generating anti-D antibodies.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Universal Donors & Recipients */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-bold text-stone-900">
            Universal Donors vs. Universal Recipients
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-stone-700">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 space-y-1.5">
              <span className="font-extrabold text-red-950 text-sm block">
                O Negative (O-) • Universal Red Cell Donor
              </span>
              <p className="leading-relaxed">
                Because O- red blood cells carry neither A, B, nor Rh antigens, they will not trigger an acute hemolytic transfusion reaction in recipients of any blood group. In trauma emergencies where there is zero time to test the victim&apos;s blood, O- units are life-saving.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-1.5">
              <span className="font-extrabold text-emerald-950 text-sm block">
                AB Positive (AB+) • Universal Red Cell Recipient
              </span>
              <p className="leading-relaxed">
                Patients who are AB+ express A, B, and Rh antigens, meaning their plasma does not recognize any transfused red blood cell antigens as foreign. Therefore, they can safely receive red cells from all eight blood groups when clinically necessary.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <Link href="/search">
          <Button variant="primary" size="lg" className="font-bold gap-2">
            Search Voluntary Donors <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/request-blood">
          <Button variant="outline" size="lg" className="font-bold">
            Create Blood Request
          </Button>
        </Link>
      </div>
    </div>
  );
}
