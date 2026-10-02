"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Droplet, 
  Menu, 
  X, 
  Search, 
  PlusCircle, 
  User, 
  HeartHandshake, 
  Layers, 
  HelpCircle,
  ShieldCheck,
  RotateCcw,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { donorStore } from "@/lib/donor-store";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<{ name: string; bloodGroup?: string } | null>(null);

  React.useEffect(() => {
    const updateUser = () => {
      const u = donorStore.getCurrentUser();
      if (u) {
        setCurrentUser({
          name: u.donor.display_name || u.profile.full_name,
          bloodGroup: u.donor.blood_group,
        });
      } else {
        setCurrentUser(null);
      }
    };

    updateUser();
    window.addEventListener("bloodlink_auth_changed", updateUser);
    window.addEventListener("bloodlink_store_updated", updateUser);

    return () => {
      window.removeEventListener("bloodlink_auth_changed", updateUser);
      window.removeEventListener("bloodlink_store_updated", updateUser);
    };
  }, []);

  const navLinks = [
    { href: "/search", label: "Find Donors", icon: Search },
    { href: "/blood-banks", label: "Hospitals & Blood Banks", icon: Building2 },
    { href: "/request-blood", label: "Request Blood", icon: PlusCircle },
    { href: "/blood-compatibility", label: "Compatibility Chart", icon: Layers },
    { href: "/eligibility", label: "Eligibility Guide", icon: HelpCircle },
    { href: "/admin/eligibility", label: "Admin Desk", icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 sm:h-18 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-2.5 group focus-visible:outline-2 focus-visible:outline-red-800 rounded-xl p-1"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-700 to-red-900 text-white shadow-sm shadow-red-900/30 group-hover:scale-105 transition-transform">
            <Droplet className="h-6 w-6 fill-rose-100 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-stone-900 leading-none flex items-center gap-1.5">
              Blood<span className="text-red-700">Link</span>
              <span className="hidden xs:inline-block rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800 tracking-wide uppercase">
                Directory
              </span>
            </span>
            <span className="text-[11px] font-medium text-stone-500 hidden sm:inline">
              Voluntary Donor Finder
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl transition-colors ${
                  isActive
                    ? "bg-rose-50 text-red-900"
                    : "text-stone-700 hover:text-red-800 hover:bg-stone-50"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-red-700" : "text-stone-500"}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Right Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Link href="/register">
            <Button variant="secondary" size="md" className="hidden md:inline-flex gap-1.5">
              <HeartHandshake className="h-4 w-4 text-red-700" />
              Become a Donor
            </Button>
          </Link>

          {currentUser ? (
            <Link href="/dashboard">
              <Button variant="primary" size="md" className="gap-2">
                <User className="h-4 w-4" />
                <span className="max-w-[120px] truncate">{currentUser.name.split(" ")[0]}</span>
                {currentUser.bloodGroup && (
                  <Badge variant="default" size="sm" className="bg-white/20 text-white border-transparent">
                    {currentUser.bloodGroup}
                  </Badge>
                )}
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="md" className="gap-1.5">
                <User className="h-4 w-4 text-stone-600" />
                Donor Login
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 sm:hidden">
          {currentUser && (
            <Link href="/dashboard">
              <Badge variant="crimson" size="sm" className="h-8 px-2.5">
                {currentUser.bloodGroup || "Dashboard"}
              </Badge>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-red-800"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top duration-200">
          <div className="grid gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-3 text-base font-semibold rounded-xl ${
                    isActive
                      ? "bg-rose-50 text-red-900 font-bold"
                      : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-red-700" : "text-stone-500"}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-stone-100 flex flex-col gap-2.5">
            <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="secondary" size="lg" className="w-full justify-center">
                <HeartHandshake className="h-5 w-5 mr-2 text-red-700" />
                Become a Voluntary Donor
              </Button>
            </Link>

            {currentUser ? (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="lg" className="w-full justify-center">
                  <User className="h-5 w-5 mr-2" />
                  My Donor Dashboard ({currentUser.bloodGroup})
                </Button>
              </Link>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="lg" className="w-full justify-center">
                  <User className="h-5 w-5 mr-2" />
                  Donor Account Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
