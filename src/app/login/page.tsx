"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { donorStore } from "@/lib/donor-store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { 
  Lock, 
  Droplet, 
  ShieldCheck, 
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  RefreshCw,
  Building2,
  CheckCircle2,
  ShieldAlert
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [authMethod, setAuthMethod] = React.useState<"password" | "otp">("password");
  
  // Password state
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // OTP state
  const [otpType, setOtpType] = React.useState<"email" | "phone">("email");
  const [otpIdentifier, setOtpIdentifier] = React.useState("");
  const [otpCode, setOtpCode] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpCooldown, setOtpCooldown] = React.useState(0);
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = React.useState(false);
  const [demoCodeHint, setDemoCodeHint] = React.useState<string | null>(null);

  // Password reset modal
  const [resetModalOpen, setResetModalOpen] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState("");
  const [resetSent, setResetSent] = React.useState(false);

  // Cooldown countdown effect
  React.useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your registered email and password");
      return;
    }

    setIsLoading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.signInWithPassword({ email, password });
        } catch (supabaseErr) {
          console.warn("Supabase auth error:", supabaseErr);
        }
      }

      const user = await donorStore.authenticateUser(email, password);

      if (!user) {
        toast.error("Invalid credentials or unregistered account. Please check your email/password or register.");
        setIsLoading(false);
        return;
      }

      toast.success(`Welcome back, ${user.profile.full_name}! (${user.donor.blood_group})`);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Login encountered an error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpIdentifier.trim()) {
      toast.error(`Please enter your registered ${otpType}`);
      return;
    }

    setIsSendingOtp(true);
    setDemoCodeHint(null);

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: otpIdentifier.trim(), type: otpType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code.");
      }

      setOtpSent(true);
      setOtpCooldown(data.cooldownSeconds || 60);
      if (data.demoCode) {
        setDemoCodeHint(data.demoCode);
        setOtpCode(data.demoCode); // Pre-fill for ease in testing
      }
      toast.success(data.message || `Verification code sent to ${otpIdentifier}`);
    } catch (err: any) {
      toast.error(err.message || "Could not send verification code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: otpIdentifier.trim(),
          code: otpCode.trim(),
          type: otpType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid or expired code.");
      }

      if (data.user) {
        // Sync with local donorStore
        donorStore.setCurrentUserId(data.user.profile.id);
        toast.success(`Verified! Welcome back, ${data.user.profile.full_name}`);
        router.push("/dashboard");
      } else {
        toast.success("Code verified! Complete your voluntary donor registration.");
        router.push(`/register?verifiedId=${encodeURIComponent(otpIdentifier)}&type=${otpType}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed. Please retry.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your registered email");
      return;
    }
    setResetSent(true);
    toast.success("Password recovery link generated.");
  };

  const quickFillDemo = (demoEmail: string, demoPass: string) => {
    setAuthMethod("password");
    setEmail(demoEmail);
    setPassword(demoPass);
    toast.info(`Filled credentials for ${demoEmail}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-800 to-red-950 text-white shadow-md shadow-red-900/20">
          <Droplet className="h-6 w-6 fill-rose-100" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          BloodLink Sign In
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
          Access your donor dashboard, update clinical availability, or broadcast institutional hospital requirements.
        </p>
      </div>

      {/* Anti-Scam Disclaimer Notice */}
      <div className="max-w-3xl mx-auto rounded-2xl bg-amber-50/80 border border-amber-200/90 p-4 text-xs text-amber-950 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-900">Official Anti-Scam Notice: </span>
          BloodLink strictly prohibits the commercial sale of blood. Under the Drugs & Cosmetics Act, selling blood is a criminal offense. BloodLink never asks for advance payments, delivery charges, or transaction fees.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start max-w-3xl mx-auto">
        {/* Main Sign-in Card */}
        <div className="md:col-span-7">
          <Card className="border-stone-200/90 shadow-md">
            {/* Auth Method Switcher */}
            <div className="flex border-b border-stone-200 bg-stone-50/70 p-1.5 rounded-t-2xl gap-1">
              <button
                type="button"
                onClick={() => setAuthMethod("password")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMethod === "password"
                    ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Lock className="h-3.5 w-3.5 text-red-800" />
                Password Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod("otp")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMethod === "otp"
                    ? "bg-white text-stone-900 shadow-xs border border-stone-200"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <KeyRound className="h-3.5 w-3.5 text-red-800" />
                OTP / Magic Link
              </button>
            </div>

            <CardContent className="p-5 sm:p-6 space-y-4">
              {authMethod === "password" ? (
                /* PASSWORD SIGN IN FORM */
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <Input
                    label="Registered Email Address"
                    type="email"
                    placeholder="e.g. yourname@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email);
                          setResetSent(false);
                          setResetModalOpen(true);
                        }}
                        className="text-xs text-red-800 hover:text-red-950 font-semibold cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 pr-10 text-sm text-stone-900 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-800"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-400 hover:text-stone-700"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    className="w-full font-bold shadow-sm shadow-red-900/20"
                  >
                    Sign In with Password
                  </Button>
                </form>
              ) : (
                /* OTP SIGN IN / VERIFY FORM */
                <div className="space-y-4">
                  {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                      {/* OTP Channel Selector */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setOtpType("email")}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            otpType === "email"
                              ? "border-red-800 bg-rose-50 text-red-900"
                              : "border-stone-200 text-stone-600 hover:bg-stone-50"
                          }`}
                        >
                          <Mail className="h-4 w-4" />
                          Email OTP
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpType("phone")}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                            otpType === "phone"
                              ? "border-red-800 bg-rose-50 text-red-900"
                              : "border-stone-200 text-stone-600 hover:bg-stone-50"
                          }`}
                        >
                          <Phone className="h-4 w-4" />
                          Mobile SMS OTP
                        </button>
                      </div>

                      <Input
                        label={otpType === "email" ? "Registered Email Address" : "Registered Mobile Number"}
                        type={otpType === "email" ? "email" : "tel"}
                        placeholder={otpType === "email" ? "donor@example.com" : "+91 9988776655"}
                        value={otpIdentifier}
                        onChange={(e) => setOtpIdentifier(e.target.value)}
                        required
                      />

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={isSendingOtp}
                        className="w-full font-bold shadow-sm shadow-red-900/20"
                      >
                        Send Verification Code
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-red-900 space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          One-Time Passcode Dispatched
                        </p>
                        <p className="text-stone-700">
                          Sent to <strong>{otpIdentifier}</strong> (valid for 10 minutes).
                        </p>
                        {demoCodeHint && (
                          <div className="mt-2 bg-white/80 p-2 rounded-lg border border-rose-300 font-mono text-[11px] text-red-800">
                            <strong>Demo Code:</strong> {demoCodeHint} (Auto-filled for demonstration)
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                          Enter 6-Digit Passcode *
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          className="flex h-12 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-center font-mono text-lg font-bold tracking-widest text-stone-900 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-800"
                          required
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="text-stone-500 hover:text-stone-800 font-medium"
                        >
                          Change Number/Email
                        </button>

                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpCooldown > 0 || isSendingOtp}
                          className="text-red-800 hover:text-red-950 font-bold disabled:opacity-50 flex items-center gap-1"
                        >
                          <RefreshCw className={`h-3 w-3 ${isSendingOtp ? "animate-spin" : ""}`} />
                          {otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : "Resend Code"}
                        </button>
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={isVerifyingOtp}
                        className="w-full font-bold shadow-sm shadow-red-900/20"
                      >
                        Verify & Sign In
                      </Button>
                    </form>
                  )}
                </div>
              )}

              {/* Demo Accounts Panel */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-950 flex items-center gap-1.5">
                    <Badge variant="demo" size="sm">DEMO ACCOUNTS</Badge>
                  </span>
                  <span className="text-[10px] text-purple-700">One-click test fill</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => quickFillDemo("arjun.k@example.com", "Password123!")}
                    className="p-2 rounded-lg bg-white border border-purple-200 text-left hover:border-purple-400 transition-colors"
                  >
                    <p className="font-bold text-stone-900">Arjun K. (O+)</p>
                    <p className="text-[10px] text-stone-500">Voluntary Donor</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFillDemo("priya.m@example.com", "Password123!")}
                    className="p-2 rounded-lg bg-white border border-purple-200 text-left hover:border-purple-400 transition-colors"
                  >
                    <p className="font-bold text-stone-900">Priya M. (A+)</p>
                    <p className="text-[10px] text-stone-500">Verified Donor</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFillDemo("ananya.s@example.com", "Password123!")}
                    className="p-2 rounded-lg bg-white border border-purple-200 text-left hover:border-purple-400 transition-colors"
                  >
                    <p className="font-bold text-stone-900">Ananya S. (O-)</p>
                    <p className="text-[10px] text-stone-500">Universal Red Cells</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("admin@bloodlink.org");
                      setPassword("");
                      toast.info("Admin account selected. Enter your local environment password (BLOODLINK_ADMIN_PASSWORD) or sign in on localhost.");
                    }}
                    className="p-2 rounded-lg bg-white border border-purple-200 text-left hover:border-purple-400 transition-colors"
                  >
                    <p className="font-bold text-stone-900">Dr. K. Rao (Admin)</p>
                    <p className="text-[10px] text-stone-500">Medical Officer (Env / Local)</p>
                  </button>
                </div>
              </div>

              <div className="pt-2 text-center text-xs text-stone-600">
                Need to register your blood group?{" "}
                <Link href="/register" className="font-bold text-red-800 underline">
                  Register as a donor now
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Info Sidebar */}
        <aside className="md:col-span-5 space-y-4 text-xs">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              Verified Trust & Safety
            </h3>
            <p className="text-stone-600 leading-relaxed">
              BloodLink protects voluntary donors with strict phone number and email privacy. Your personal contact details are never shown on public searches and are only revealed with your explicit mutual consent.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
            <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-red-800" />
              Hospital & Blood Centre Access
            </h4>
            <p className="text-stone-600 leading-relaxed">
              Are you representing an authorized medical college, district hospital, or licensed blood centre?
            </p>
            <Link
              href="/register/organization"
              className="text-red-800 hover:text-red-950 font-bold inline-flex items-center gap-1 pt-1"
            >
              Register Healthcare Facility <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </aside>
      </div>

      {/* Password Reset Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Account Password"
        description="Enter the email associated with your voluntary donor profile."
        size="sm"
      >
        {resetSent ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 text-xs space-y-1">
              <p className="font-bold">Password Reset Instructions Sent</p>
              <p>
                A secure password reset link has been dispatched to <strong>{resetEmail}</strong>.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setResetModalOpen(false)}
              className="w-full"
            >
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. yourname@example.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Send Reset Link
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
