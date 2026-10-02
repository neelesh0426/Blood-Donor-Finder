import * as React from "react";
import Link from "next/link";
import { Droplet, PhoneCall, Shield, Heart, ExternalLink, AlertTriangle } from "lucide-react";
import { SAFETY_DISCLAIMER_TEXT } from "./safety-disclaimer-banner";

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-900 text-stone-300 pt-12 pb-24 md:pb-12 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Critical Safety Callout in Footer */}
        <div className="rounded-2xl border border-rose-900/50 bg-stone-950/80 p-5 md:p-6 text-stone-200">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-900/40 text-rose-400 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Informational Directory Disclaimer
              </p>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal">
                {SAFETY_DISCLAIMER_TEXT}
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Helplines Callout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-stone-800/60 border border-stone-700/50">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-950 text-rose-400 font-black">
              108
            </span>
            <div>
              <p className="font-semibold text-white text-xs">Emergency Ambulance</p>
              <p className="text-[11px] text-stone-400">National 24/7 Medical Response</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-950 text-rose-400 font-black">
              104
            </span>
            <div>
              <p className="font-semibold text-white text-xs">Health & Blood Helpline</p>
              <p className="text-[11px] text-stone-400">Government Medical Advice</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-950 text-rose-400 font-black">
              112
            </span>
            <div>
              <p className="font-semibold text-white text-xs">All-in-One Emergency</p>
              <p className="text-[11px] text-stone-400">Police, Fire & Medical</p>
            </div>
          </div>

          <a
            href="https://eraktkosh.mohfw.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-red-900/30 border border-red-800/40 text-rose-200 hover:text-white hover:bg-red-900/50 transition-colors"
          >
            <div className="text-xs">
              <p className="font-semibold">eRaktKosh Portal</p>
              <p className="text-[10px] text-stone-400">Govt. Blood Bank Stock</p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-rose-300" />
          </a>
        </div>

        {/* 4-column directory navigation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-4">
          {/* Col 1: Brand & Mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-800 text-white">
                <Droplet className="h-5 w-5 fill-rose-200" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">BloodLink</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              A privacy-conscious directory connecting voluntary blood donors with individuals in need. We empower communities without compromising donor phone or email privacy.
            </p>
            <p className="text-[11px] text-stone-500 font-mono">
              Demo Version 1.0 • Privacy by Default
            </p>
          </div>

          {/* Col 2: Find & Request */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Donors & Requests</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/search" className="hover:text-white transition-colors">
                  Search Voluntary Donors
                </Link>
              </li>
              <li>
                <Link href="/blood-banks" className="hover:text-white transition-colors text-rose-300 font-semibold">
                  Hospital & Blood Bank Centres
                </Link>
              </li>
              <li>
                <Link href="/request-blood" className="hover:text-white transition-colors">
                  Create Blood Request
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Register as a Donor
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Donor Login & Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Education & Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Clinical Guidance</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/blood-compatibility" className="hover:text-white transition-colors">
                  Blood Group Compatibility Chart
                </Link>
              </li>
              <li>
                <Link href="/eligibility" className="hover:text-white transition-colors">
                  Donor Eligibility Guidelines
                </Link>
              </li>
              <li>
                <a
                  href="https://eraktkosh.mohfw.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white inline-flex items-center gap-1 transition-colors"
                >
                  eRaktKosh National Portal <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://indianredcross.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white inline-flex items-center gap-1 transition-colors"
                >
                  Indian Red Cross Blood Services <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Trust & Policies</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy (Protected Contact)
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service & Disclaimer
                </Link>
              </li>
              <li>
                <span className="text-stone-500 block pt-1">
                  Non-Commercial Voluntary Project
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-800 pt-6 text-center text-xs text-stone-500">
          <p>© {new Date().getFullYear()} BloodLink – Voluntary Blood Donor Finder. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
