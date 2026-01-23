import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createTrainingSession, getDatasets } from "@/lib/supabase/database";
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
    const { datasetId } = body;

    // If no datasetId provided, use the first available dataset
    let finalDatasetId = datasetId;
    if (!finalDatasetId) {
      const datasets = await getDatasets();
      if (datasets.length === 0) {
        return NextResponse.json(
          { error: "No datasets available" },
          { status: 400 }
        );
      }
      finalDatasetId = datasets[0].id;
    }

    const session = await createTrainingSession(userId, finalDatasetId);

    return NextResponse.json({
      success: true,
      session: {
        id: session.id.toString(), // Convert bigint to string for JSON
        user_id: session.user_id,
        dataset_id: session.dataset_id,
        created_at: session.created_at,
      },
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

