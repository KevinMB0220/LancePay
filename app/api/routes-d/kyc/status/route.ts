import { NextRequest, NextResponse } from "next/server";
import { getCustomerStatus } from "@/lib/sep12-kyc";

/**
 * GET /api/kyc/status
 * Get user's KYC verification status
 */
export async function GET(req: NextRequest) {
  try {
    const stellarAddress = req.headers.get("x-stellar-address");
    const authToken = req.headers.get("x-sep10-token");

    if (!stellarAddress || !authToken) {
      return NextResponse.json(
        { error: "Stellar address and auth token required" },
        { status: 400 }
      );
    }

    const customerInfo = await getCustomerStatus(stellarAddress, authToken);

    return NextResponse.json({
      success: true,
      data: customerInfo,
    });
  } catch (error: any) {
    console.error("Error fetching KYC status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch KYC status" },
      { status: 500 }
    );
  }
}
