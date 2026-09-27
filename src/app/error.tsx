"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Application error boundary triggered:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center space-y-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-amber-800 shadow-md">
        <AlertCircle className="h-10 w-10" />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
          Temporary Issue
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Something went wrong
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          We encountered an unexpected error while loading this page. Please try refreshing or return to the directory home.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Button variant="primary" size="md" onClick={() => reset()} className="font-bold gap-2">
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
        <Link href="/">
          <Button variant="outline" size="md" className="font-bold gap-2">
            <Home className="h-4 w-4" />
            Go to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
