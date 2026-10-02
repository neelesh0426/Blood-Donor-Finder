import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Droplet, Search, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center space-y-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-100 text-red-800 shadow-md shadow-red-900/10">
        <Droplet className="h-10 w-10 fill-rose-200" />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="text-xs font-bold uppercase tracking-wider text-red-800">
          Error 404
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
          The requested page does not exist or may have been moved. If you are looking for an urgent blood donor, please use our directory search.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Link href="/">
          <Button variant="primary" size="md" className="font-bold gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <Link href="/search">
          <Button variant="outline" size="md" className="font-bold gap-2">
            <Search className="h-4 w-4" />
            Search Donors
          </Button>
        </Link>
      </div>
    </div>
  );
}
