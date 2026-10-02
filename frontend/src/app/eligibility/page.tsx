import * as React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { EligibilityQuiz } from "@/components/educational/eligibility-quiz";
import { SafetyDisclaimerBanner } from "@/components/layout/safety-disclaimer-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Heart, 
  Clock, 
  Coffee, 
  ShieldAlert, 
  ArrowRight 
} from "lucide-react";

export const metadata: Metadata = {
  title: "Donor Eligibility Guide | BloodLink",
  description: "Learn about medical and biological blood donor eligibility criteria, deferral periods, preparation steps, and self-screening checklist.",
};

export default function EligibilityPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Prominent Safety Disclaimer */}
      <SafetyDisclaimerBanner />

      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-red-800">
          <HelpCircle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
          Blood Donor Eligibility Guide
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          Comprehensive guidance based on standard National Blood Transfusion Council regulations. Check if you can safely volunteer to donate.
        </p>
      </div>

      {/* Interactive Self-Screening Quiz */}
      <section className="space-y-4">
        <div className="text-center sm:text-left">
          <h2 className="text-lg sm:text-xl font-bold text-stone-900">
            Interactive Preliminary Self-Check
          </h2>
          <p className="text-xs text-stone-500">
            This tool provides preliminary informational screening only. Official clearance is performed by the medical officer at the blood centre.
          </p>
        </div>

        <EligibilityQuiz />
      </section>

      {/* Key Eligibility Criteria Grid */}
      <section className="space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-stone-900">
          Core Physical Criteria for Voluntary Donors
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-stone-200">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-800" />
                Age Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-stone-600 space-y-1.5 leading-relaxed">
              <p><strong>18 to 65 years:</strong> First-time donors must be at least 18 years old. Regular donors in good general health may continue up to 65 years under doctor evaluation.</p>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-800" />
                Weight & Volume
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-stone-600 space-y-1.5 leading-relaxed">
              <p><strong>Minimum 45 kg:</strong> To donate 350 ml of whole blood. Donors weighing 55 kg or above are eligible for 450 ml collection or apheresis platelet donation.</p>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                Hemoglobin Level
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 text-xs text-stone-600 space-y-1.5 leading-relaxed">
              <p><strong>Min. 12.5 g/dL:</strong> Verified through a rapid finger-prick test before donation to ensure the donor will not suffer anemia or weakness.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Deferral Periods & Safety */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-stone-900">
            Common Temporary Deferral Reasons
          </h2>
          <p className="text-xs text-stone-500">
            Temporary waiting periods protect both the voluntary donor and the recipient.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
            <span className="font-bold text-stone-900 block">Tattoos & Piercings: 6 Months</span>
            <p className="text-stone-600 leading-relaxed">
              Wait 6 months after receiving any tattoo, body piercing, or acupuncture treatment before donating blood.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
            <span className="font-bold text-stone-900 block">Minor Surgery or Dental Extraction: 3 to 6 Months</span>
            <p className="text-stone-600 leading-relaxed">
              Dental surgery or root canal requires 72 hours to 6 months depending on antibiotic usage and healing.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
            <span className="font-bold text-stone-900 block">Antibiotics or Acute Infection</span>
            <p className="text-stone-600 leading-relaxed">
              Wait at least 7 to 14 days after completing an antibiotic course and resolution of fever or cold symptoms.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
            <span className="font-bold text-stone-900 block">Pregnancy & Lactation</span>
            <p className="text-stone-600 leading-relaxed">
              Defer donation throughout pregnancy and for 6 to 12 months post-delivery and during breastfeeding.
            </p>
          </div>
        </div>
      </section>

      {/* Pre & Post Donation Tips */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl border border-stone-200 bg-white space-y-3 text-xs text-stone-700">
          <div className="flex items-center gap-2 font-bold text-sm text-stone-900">
            <Coffee className="h-4 w-4 text-red-800" />
            <span>Before You Donate</span>
          </div>
          <ul className="space-y-2 list-disc list-inside text-stone-600 leading-relaxed">
            <li>Drink 500 ml of water or non-caffeinated fluids 30 minutes prior.</li>
            <li>Eat a nutritious light meal 2-3 hours beforehand. Never donate on an empty stomach.</li>
            <li>Get a solid night of rest (at least 6-7 hours) before donating.</li>
            <li>Avoid smoking for at least 2 hours before donation.</li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl border border-stone-200 bg-white space-y-3 text-xs text-stone-700">
          <div className="flex items-center gap-2 font-bold text-sm text-stone-900">
            <Heart className="h-4 w-4 text-emerald-700" />
            <span>After You Donate</span>
          </div>
          <ul className="space-y-2 list-disc list-inside text-stone-600 leading-relaxed">
            <li>Rest at the blood centre refreshment area for 10-15 minutes.</li>
            <li>Drink extra fluids throughout the day to replenish plasma volume.</li>
            <li>Avoid strenuous workouts or heavy lifting with the venipuncture arm for 24 hours.</li>
            <li>Keep the bandage dry and in place for at least 4-5 hours.</li>
          </ul>
        </div>
      </section>

      {/* Action Footer */}
      <div className="text-center pt-4">
        <Link href="/register">
          <Button variant="primary" size="lg" className="font-bold gap-2">
            Register as a Voluntary Donor <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
