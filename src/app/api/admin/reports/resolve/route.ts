import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";

const resolveReportSchema = z.object({
  reportId: z.string().min(1, "Report ID is required"),
  decision: z.enum(["investigating", "resolved", "dismissed"]),
  actorName: z.string().default("Moderator"),
  moderationNotes: z.string().min(5, "Moderation notes must be at least 5 characters"),
  applyAction: z.enum(["suspend_target", "restore_target", "none"]).default("none"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parseResult = resolveReportSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid review parameters.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { reportId, decision, actorName, moderationNotes, applyAction } = parseResult.data;

    const report = await serverDb.resolveReport(
      reportId,
      decision,
      { name: actorName, role: "admin" },
      moderationNotes,
      applyAction
    );

    return NextResponse.json({
      success: true,
      message: `Report status resolved to '${decision}'.`,
      report,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to resolve report." },
      { status: 400 }
    );
  }
}
