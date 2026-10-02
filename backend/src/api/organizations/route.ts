import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { organizationRegistrationSchema } from "@/lib/organizations/service";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/security/rate-limiter";
import { verifyTurnstileToken } from "@/lib/security/captcha";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as any;
    const city = searchParams.get("city") || undefined;

    const organizations = await serverDb.getOrganizations({ status, city });
    return NextResponse.json({ success: true, organizations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch organizations." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { captchaToken, ...data } = json;

    // Rate limiting: 5 registrations per hour
    const rateLimit = checkRateLimit("blood_request", data.contactEmail || "anon_org");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: rateLimit.error || "Rate limit exceeded. Please wait before registering." },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // CAPTCHA verification
    const captcha = await verifyTurnstileToken(captchaToken);
    if (!captcha.success) {
      return NextResponse.json(
        { error: captcha.error || "Security verification check failed." },
        { status: 400 }
      );
    }

    const parseResult = organizationRegistrationSchema.safeParse(data);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid organization registration details.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const organization = await serverDb.registerOrganization(parseResult.data);

    return NextResponse.json(
      {
        success: true,
        message: "Organization application registered successfully. Credentials are now under administrative and clinical verification review.",
        organization,
      },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to register organization." },
      { status: 400 }
    );
  }
}
