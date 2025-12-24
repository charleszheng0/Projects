import { NextResponse } from "next/server";
import { generateRandomHand, getPositionFromSeat } from "@/lib/gto";

export async function GET() {
  try {
    const numPlayers = Math.floor(Math.random() * 8) + 2; // 2-9 players
    const playerSeat = Math.floor(Math.random() * numPlayers);
    const playerPosition = getPositionFromSeat(playerSeat, numPlayers);
    const playerHand = generateRandomHand();

    return NextResponse.json({
      hand: playerHand,
      numPlayers,
      playerSeat,
      playerPosition,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to deal hand" },
      { status: 500 }
    );
  }
}

