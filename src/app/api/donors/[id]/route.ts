import { NextResponse } from "next/server";
import { serverDb } from "@/lib/server-db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const donor = await serverDb.getDonorById(id);

    if (!donor) {
      return NextResponse.json({ error: "Donor not found." }, { status: 404 });
    }

    const { passwordHash: _, ...safeDonor } = donor;
    return NextResponse.json({ success: true, donor: safeDonor });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch donor." }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();

    const updated = await serverDb.updateDonor(id, updates);
    const { passwordHash: _, ...safeDonor } = updated;

    return NextResponse.json({
      success: true,
      message: "Donor profile updated successfully",
      donor: safeDonor,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update profile." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await serverDb.deleteDonor(id);

    if (!deleted) {
      return NextResponse.json({ error: "Donor profile not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Donor profile permanently deleted from database.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to delete donor profile." },
      { status: 500 }
    );
  }
}
