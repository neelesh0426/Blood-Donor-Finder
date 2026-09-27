import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export async function POST() {
  try {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("[Supabase Auth] signOut error:", err);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Successfully signed out.",
    });

    // Clear session cookies if any
    response.cookies.delete("sb-access-token");
    response.cookies.delete("sb-refresh-token");

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to sign out." },
      { status: 500 }
    );
  }
}
