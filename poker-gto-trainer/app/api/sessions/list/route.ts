import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTrainingSessions } from "@/lib/supabase/database";
import { getOrCreateProfile } from "@/lib/supabase/auth-helpers";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ensure user profile exists
    await getOrCreateProfile(userId);

    const sessions = await getTrainingSessions(userId);

    return NextResponse.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session.id.toString(), // Convert bigint to string
        user_id: session.user_id,
        dataset_id: session.dataset_id,
        created_at: session.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

