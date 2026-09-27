"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, HelpCircle, Check, X, RotateCcw } from "lucide-react";
import Link from "next/link";

interface Question {
  id: string;
  question: string;
  requirement: string;
  rationale: string;
}

const ELIGIBILITY_QUESTIONS: Question[] = [
  {
    id: "age",
    question: "Are you between 18 and 65 years of age?",
    requirement: "Minimum 18 years, up to 65 years for regular donors.",
    rationale: "Ensures physiological maturity and cardiovascular resilience during fluid withdrawal.",
  },
  {
    id: "weight",
    question: "Do you weigh at least 45 kg (99 lbs)?",
    requirement: "Minimum 45 kg for whole blood donation (350 ml). 55 kg for 450 ml collection.",
    rationale: "Protects donor blood volume to avoid vasovagal syncopal reactions.",
  },
  {
    id: "interval",
    question: "Has it been at least 90 days (males) or 120 days (females) since your last whole blood donation?",
    requirement: "Male interval: 3 months; Female interval: 4 months.",
    rationale: "Allows complete replenishment of red blood cells and bone marrow iron reserves.",
  },
  {
    id: "health",
    question: "Are you currently feeling healthy, well, and free of active cold, flu, fever, or infectious symptoms?",
    requirement: "Good general health on day of donation; normal temperature and pulse.",
    rationale: "Prevents stress on recovering body and ensures recipient safety.",
  },
  {
    id: "lifestyle",
    question: "Have you avoided tattoos, ear/body piercings, or major dental extractions in the last 6 months?",
    requirement: "6 months temporary deferral following invasive needle exposure.",
    rationale: "Mitigates window-period risk for blood-borne viral transmissions.",
  },
];

export function EligibilityQuiz() {
  const [answers, setAnswers] = React.useState<Record<string, boolean>>({});
  const [showResult, setShowResult] = React.useState(false);

  const handleAnswer = (questionId: string, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === ELIGIBILITY_QUESTIONS.length;

  const allPassed =
    isComplete && Object.values(answers).every((val) => val === true);

  const resetQuiz = () => {
    setAnswers({});
    setShowResult(false);
  };

  return (
    <Card className="border-stone-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-stone-50/70 border-b border-stone-100 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-800">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-lg font-bold text-stone-900">
                Voluntary Donor Self-Screening Check
              </CardTitle>
              <CardDescription className="text-xs">
                Answer 5 standard preliminary criteria based on Indian National Blood Transfusion Council guidelines.
              </CardDescription>
            </div>
          </div>
          {answeredCount > 0 && (
            <button
              onClick={resetQuiz}
              className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 font-semibold"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        <div className="space-y-4">
          {ELIGIBILITY_QUESTIONS.map((q, idx) => {
            const currentAns = answers[q.id];
            return (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-stone-200/80 bg-white transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-800">
                      Step {idx + 1} of {ELIGIBILITY_QUESTIONS.length}
                    </p>
                    <p className="text-sm font-semibold text-stone-900 leading-snug">
                      {q.question}
                    </p>
                    <p className="text-xs text-stone-500">
                      <strong>Standard: </strong> {q.requirement}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAnswer(q.id, true)}
                      className={`h-9 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                        currentAns === true
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                          : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-emerald-50 hover:border-emerald-300"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Yes
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAnswer(q.id, false)}
                      className={`h-9 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                        currentAns === false
                          ? "bg-red-700 text-white border-red-700 shadow-xs"
                          : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-red-50 hover:border-red-300"
                      }`}
                    >
                      <X className="h-3.5 w-3.5" />
                      No
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Results Box */}
        {isComplete && (
          <div
            className={`p-5 rounded-2xl border transition-all animate-in fade-in duration-300 ${
              allPassed
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                : "bg-amber-50/90 border-amber-200 text-amber-950"
            }`}
          >
            <div className="flex items-start gap-3">
              {allPassed ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-700 shrink-0 mt-0.5" />
              )}
              <div className="space-y-2">
                <h4 className="font-bold text-base">
                  {allPassed
                    ? "Preliminary Criteria Satisfied!"
                    : "Temporary Deferral or Consideration Needed"}
                </h4>
                <p className="text-xs sm:text-sm leading-relaxed">
                  {allPassed
                    ? "Based on your self-answers, you appear eligible for voluntary donation! Note that your hemoglobin level (minimum 12.5 g/dL) and blood pressure will be tested at the blood centre."
                    : "One or more answers indicate that you may need to wait before donating, or consult a qualified doctor at a certified blood centre for a full clinical screening."}
                </p>

                <div className="pt-2 flex flex-wrap gap-2.5">
                  {allPassed ? (
                    <Link href="/register">
                      <Button variant="primary" size="sm" className="bg-emerald-800 hover:bg-emerald-900">
                        Register as Voluntary Donor
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" onClick={resetQuiz}>
                      Retake Screening
                    </Button>
                  )}
                  <Link href="/search">
                    <Button variant="outline" size="sm">
                      Find Registered Donors
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
