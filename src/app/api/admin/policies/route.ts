import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";
import { z } from "zod";

const updatePolicySchema = z.object({
  donationType: z.enum(["whole_blood", "platelets", "plasma", "double_red_cells"]),
  name: z.string().optional(),
  cooldownMonths: z.number().int().min(0).max(24).optional(),
  cooldownDays: z.number().int().min(0).max(365).optional(),
  description: z.string().optional(),
  actorName: z.string().default("Administrator"),
});

export async function GET() {
  try {
    const policies = await serverDb.getPolicies();
    return NextResponse.json({
      success: true,
      policies,
    });
  } catch (error: any) {
    console.error("Error fetching cooldown policies:", error);
    return NextResponse.json(
      { error: "Failed to retrieve cooldown policies." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const json = await req.json();
    const parseResult = updatePolicySchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid policy data.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { donationType, name, cooldownMonths, cooldownDays, description, actorName } = parseResult.data;

    const updated = await serverDb.updatePolicy(
      donationType,
      {
        name,
        cooldownMonths,
        cooldownDays,
        description,
      },
      { name: actorName, role: "admin" }
    );

    return NextResponse.json({
      success: true,
      message: `Cooldown policy for ${donationType} updated successfully.`,
      policy: updated,
    });
  } catch (error: any) {
    console.error("Error updating cooldown policy:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update cooldown policy." },
      { status: 500 }
    );
  }
}
