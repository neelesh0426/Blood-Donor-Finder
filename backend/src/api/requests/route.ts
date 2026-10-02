import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/security/rate-limiter";
import { verifyTurnstileToken } from "@/lib/security/captcha";
import { BloodComponentType } from "@/types/database";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const donorId = searchParams.get("donorId");

    if (!donorId) {
      return NextResponse.json({ error: "donorId is required" }, { status: 400 });
    }

    const requests = await serverDb.getDonorRequests(donorId);
    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch donor requests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      requesterName,
      requesterContact,
      organizationId,
      componentNeeded,
      patientBloodGroup,
      state,
      city,
      locality,
      hospitalName,
      neededAt,
      urgencyLevel,
      message,
      captchaToken,
    } = body;

    // 1. Rate Limiting Check (Max 5 requests per hour)
    const clientIdentifier = requesterContact || "anonymous";
    const rateLimit = checkRateLimit("blood_request", clientIdentifier);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.error || "Too many blood requests submitted. Please wait before broadcasting another request." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // 2. CAPTCHA Verification
    const captchaResult = await verifyTurnstileToken(captchaToken);
    if (!captchaResult.success) {
      return NextResponse.json(
        { error: captchaResult.error || "Security check failed. Please refresh and try again." },
        { status: 400 }
      );
    }

    if (!requesterName || !requesterContact || !patientBloodGroup || !city || !hospitalName) {
      return NextResponse.json(
        { error: "Missing required blood request details." },
        { status: 400 }
      );
    }

    // 3. Organization Verification: If creating on behalf of an institution, verify it's approved
    if (organizationId) {
      const isApproved = await serverDb.canOrganizationBroadcast(organizationId);
      if (!isApproved) {
        return NextResponse.json(
          {
            error: "Only verified healthcare facilities and blood centres with approved status can broadcast official hospital requests.",
          },
          { status: 403 }
        );
      }
    }

    const result = await serverDb.createBloodRequest({
      requesterName,
      requesterContact,
      organizationId: organizationId || null,
      componentNeeded: (componentNeeded as BloodComponentType) || "whole_blood",
      patientBloodGroup,
      state: state || "",
      city,
      locality,
      hospitalName,
      neededAt: neededAt || new Date().toISOString(),
      urgencyLevel: urgencyLevel || "urgent",
      message,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Request broadcast successfully and matched with ${result.matchedDonorsCount} active, compatible donors.`,
        request: result.request,
        matchedDonorsCount: result.matchedDonorsCount,
      },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create blood request" },
      { status: 400 }
    );
  }
}
