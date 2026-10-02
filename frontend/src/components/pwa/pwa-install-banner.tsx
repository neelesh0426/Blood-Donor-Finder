"use client";

import * as React from "react";
import { Download, X, Smartphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(() => {
    if (typeof window !== "undefined") {
      return Boolean(localStorage.getItem("bloodlink_pwa_dismissed"));
    }
    return false;
  });
  const [isInstalled, setIsInstalled] = React.useState(false);

  React.useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Register service worker if available
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.log("ServiceWorker registration failed:", err);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("bloodlink_pwa_dismissed", "true");
  };

  if (isDismissed || isInstalled || !isInstallable) {
    return null;
  }

  return (
    <aside
      aria-label="Install web application"
      className="bg-red-900 text-white px-4 py-2.5 sm:py-3 shadow-md transition-all relative z-40"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-800 shrink-0">
            <Smartphone className="h-4 w-4 text-rose-200" />
          </span>
          <p className="font-medium">
            <span className="font-bold">Install BloodLink App: </span>
            Access emergency donor search instantly from your home screen.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleInstallClick}
            className="h-8 px-3 text-xs font-semibold bg-white text-red-900 hover:bg-rose-50"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Install App
          </Button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md text-red-200 hover:text-white hover:bg-red-800 transition-colors"
            aria-label="Dismiss install banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
