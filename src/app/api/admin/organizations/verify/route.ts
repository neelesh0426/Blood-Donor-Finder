import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";
import { requireAdminOrReject } from "@/lib/security/admin-guard";

const verifyOrgSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  decision: z.enum(["approved", "rejected", "suspended"]),
  actorName: z.string().default("Administrator"),
  adminNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export async function POST(req: Request) {
  const adminCheck = requireAdminOrReject(req);
  if (!adminCheck.authorized) {
    return adminCheck.response!;
  }

  try {
    const json = await req.json();
    const parseResult = verifyOrgSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid review parameters.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { organizationId, decision, actorName, adminNotes, rejectionReason } = parseResult.data;

    const organization = await serverDb.updateOrganizationVerification(
      organizationId,
      decision,
      { name: actorName, role: "admin" },
      adminNotes,
      rejectionReason
    );

    return NextResponse.json({
      success: true,
      message: `Organization verification status updated to '${decision}'.`,
      organization,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update organization status." },
      { status: 400 }
    );
  }
}
