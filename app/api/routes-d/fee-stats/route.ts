import { NextResponse } from "next/server";
import { getFeeStats } from "@/lib/fee-estimation";

/**
 * GET /api/fee-stats
 * Get current network fee statistics
 */
export async function GET() {
  try {
    const feeData = await getFeeStats();

    return NextResponse.json({
      success: true,
      data: feeData,
    });
  } catch (error) {
    console.error("Error fetching fee stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch fee stats" },
      { status: 500 }
    );
  }
}
