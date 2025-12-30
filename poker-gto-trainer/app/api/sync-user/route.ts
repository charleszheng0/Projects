import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { syncClerkUser } from "@/lib/supabase/auth-helpers";

/**
 * API route to sync Clerk user with Supabase profile
 * Call this after user signs in to ensure their profile exists
 */
export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const profile = await syncClerkUser(userId);

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id.toString(), // Convert bigint to string
        user_id: profile.user_id,
        created_at: profile.created_at,
      },
    });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Failed to sync user" },
      { status: 500 }
    );
  }
}

