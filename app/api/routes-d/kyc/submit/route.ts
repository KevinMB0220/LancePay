import { NextRequest, NextResponse } from "next/server";
import { submitKYCData } from "@/lib/sep12-kyc";

/**
 * POST /api/kyc/submit
 * Submit KYC information to SEP-12 anchor
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const stellarAddress = req.headers.get("x-stellar-address");
    const authToken = req.headers.get("x-sep10-token");

    if (!stellarAddress || !authToken) {
      return NextResponse.json(
        { error: "Stellar address and auth token required" },
        { status: 400 }
      );
    }

    // Extract form data
    const kycData = {
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      email_address: formData.get("email_address") as string,
      phone_number: formData.get("phone_number") as string || undefined,
      address_country_code: formData.get("address_country_code") as string,
      address_city: formData.get("address_city") as string || undefined,
      address_line_1: formData.get("address_line_1") as string || undefined,
      birth_date: formData.get("birth_date") as string || undefined,
      id_type: formData.get("id_type") as any,
      id_number: formData.get("id_number") as string || undefined,
      photo_id_front: formData.get("photo_id_front") as File || undefined,
      photo_id_back: formData.get("photo_id_back") as File || undefined,
      photo_proof_residence: formData.get("photo_proof_residence") as File || undefined,
    };

    const result = await submitKYCData(stellarAddress, authToken, kycData);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error submitting KYC data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit KYC data" },
      { status: 500 }
    );
  }
}
