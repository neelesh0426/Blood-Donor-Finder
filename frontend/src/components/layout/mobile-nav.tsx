"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, PlusCircle, Layers, User, Home } from "lucide-react";
import { donorStore } from "@/lib/donor-store";

export function MobileNav() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    const checkUser = () => {
      setIsLoggedIn(Boolean(donorStore.getCurrentUser()));
    };
    checkUser();
    window.addEventListener("bloodlink_auth_changed", checkUser);
    return () => window.removeEventListener("bloodlink_auth_changed", checkUser);
  }, []);

  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/request-blood", label: "Request", icon: PlusCircle, highlight: true },
    { href: "/blood-compatibility", label: "Match", icon: Layers },
    { href: isLoggedIn ? "/dashboard" : "/login", label: isLoggedIn ? "Dashboard" : "Login", icon: User },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 md:hidden py-1 px-2 shadow-lg"
    >
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4 group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-800 text-white shadow-md shadow-red-900/40 group-active:scale-95 transition-transform">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold text-red-900 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors ${
                isActive ? "text-red-800 font-bold" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
