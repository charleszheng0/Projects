import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createHand, createUserDecision } from "@/lib/supabase/database";
import { getOrCreateProfile } from "@/lib/supabase/auth-helpers";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { sessionId, handData, decision } = body;

    if (!sessionId || !handData) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, handData" },
        { status: 400 }
      );
    }

    // Create hand
    const hand = await createHand(sessionId, handData);

    // Create decision if provided
    if (decision) {
      await createUserDecision(hand.id, {
        action: decision.action,
        is_correct: decision.is_correct,
        feedback: decision.feedback || "",
        bet_size_bb: decision.bet_size_bb || 0,
      });
    }

    return NextResponse.json({
      success: true,
      handId: hand.id,
    });
  } catch (error) {
    console.error("Error saving hand:", error);
    return NextResponse.json(
      { error: "Failed to save hand" },
      { status: 500 }
    );
  }
}

