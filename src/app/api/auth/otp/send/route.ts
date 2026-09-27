import { NextResponse } from "next/server";
import { issueOtp } from "@/lib/auth/otp-store";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/security/rate-limiter";
import { NotificationService } from "@/lib/notifications/service";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { identifier, type } = json;

    if (!identifier || !type || (type !== "email" && type !== "phone")) {
      return NextResponse.json(
        { error: "Valid email or phone number is required." },
        { status: 400 }
      );
    }

    // 1. Rate Limiting Check (Max 3 OTP requests per 10 minutes)
    const rateLimit = checkRateLimit("otp_request", identifier);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.error || "Too many OTP requests. Please wait." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // 2. Issue OTP code with cooldown and expiry
    const otpResult = issueOtp(identifier, type);
    if (otpResult.error) {
      return NextResponse.json(
        { error: otpResult.error },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // 3. If Supabase Auth is configured, trigger Supabase OTP flow
    if (isSupabaseConfigured && supabase) {
      try {
        if (type === "email") {
          await supabase.auth.signInWithOtp({ email: identifier });
        } else {
          await supabase.auth.signInWithOtp({ phone: identifier });
        }
      } catch (err) {
        console.warn("[Supabase Auth] signInWithOtp error:", err);
      }
    }

    // 4. Dispatch verification code via notification service
    const dispatchResult = await NotificationService.dispatch({
      recipientId: identifier,
      recipientEmail: type === "email" ? identifier : undefined,
      recipientPhone: type === "phone" ? identifier : undefined,
      title: "Your BloodLink Verification Code",
      body: `Your BloodLink one-time verification code is ${otpResult.code}. This code is valid for 10 minutes. Never share this code with anyone.`,
      eventType: "security_alert",
      channels: [type === "email" ? "email" : "sms"],
      urgent: true,
    });

    const isDemoEnvironment = !isSupabaseConfigured;

    return NextResponse.json(
      {
        success: true,
        message: `Verification code sent to ${identifier}.`,
        cooldownSeconds: otpResult.cooldownSeconds,
        // In demo mode without active SMS/Email credentials, provide the demo code for seamless testing
        demoCode: isDemoEnvironment ? otpResult.code : undefined,
        note: isDemoEnvironment
          ? "Demo mode: verification code provided directly above for test convenience."
          : undefined,
      },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to send verification code." },
      { status: 500 }
    );
  }
}
