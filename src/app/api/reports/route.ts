import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/security/rate-limiter";
import { verifyTurnstileToken } from "@/lib/security/captcha";

const createReportSchema = z.object({
  reporterId: z.string().optional().nullable(),
  reporterName: z.string().optional(),
  targetType: z.enum(["donor", "organization", "blood_request", "scam_report"]),
  targetId: z.string().min(1, "Target entity ID is required"),
  targetName: z.string().optional(),
  reason: z.enum([
    "commercial_blood_sale",
    "advance_payment_demand",
    "fake_donor_or_patient",
    "harassment",
    "outdated_info",
    "other",
  ]),
  description: z.string().min(10, "Please provide at least 10 characters detailing the violation"),
  captchaToken: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as any;
    const targetType = searchParams.get("targetType") as any;

    const reports = await serverDb.getReports({ status, targetType });
    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch reports." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();

    // 1. Rate limiting (Max 10 reports per day per IP/user)
    const clientIdentifier = json.reporterId || "anon_report";
    const rateLimit = checkRateLimit("report", clientIdentifier);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.error || "Report submission limit exceeded. Please wait before submitting another report." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // 2. CAPTCHA verification
    const captcha = await verifyTurnstileToken(json.captchaToken);
    if (!captcha.success) {
      return NextResponse.json(
        { error: captcha.error || "Security verification check failed." },
        { status: 400 }
      );
    }

    const parseResult = createReportSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid report data.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const report = await serverDb.createReport(parseResult.data);

    return NextResponse.json(
      {
        success: true,
        message: "Report filed successfully. Our trust & safety moderation team has queued this for investigation.",
        report,
      },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to submit report." },
      { status: 400 }
    );
  }
}
