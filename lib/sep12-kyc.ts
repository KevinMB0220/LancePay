/**
 * SEP-12 Customer Information Protocol
 * Stellar standard for KYC/AML data submission
 */

export type KYCStatus =
  | "NEEDS_INFO"
  | "PENDING"
  | "PROCESSING"
  | "ACCEPTED"
  | "REJECTED";

export interface CustomerInfo {
  id?: string;
  status: KYCStatus;
  fields?: {
    [key: string]: {
      type: string;
      description: string;
      choices?: string[];
      optional?: boolean;
    };
  };
  provided_fields?: {
    [key: string]: {
      type: string;
      description: string;
      status: "ACCEPTED" | "PROCESSING" | "REJECTED" | "VERIFICATION_REQUIRED";
      error?: string;
    };
  };
  message?: string;
}

export interface KYCFormData {
  first_name: string;
  last_name: string;
  email_address: string;
  phone_number?: string;
  address_country_code: string;
  address_city?: string;
  address_line_1?: string;
  birth_date?: string;
  id_type?: "passport" | "drivers_license" | "national_id";
  id_number?: string;
  photo_id_front?: File;
  photo_id_back?: File;
  photo_proof_residence?: File;
}

const SEP12_BASE_URL = process.env.NEXT_PUBLIC_SEP12_ENDPOINT || "";

/**
 * Get customer KYC status
 */
export async function getCustomerStatus(
  stellarAddress: string,
  authToken: string
): Promise<CustomerInfo> {
  const params = new URLSearchParams({
    account: stellarAddress,
    type: "sep31-receiver", // For receiving payments
  });

  const response = await fetch(`${SEP12_BASE_URL}/customer?${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get customer status: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Submit KYC information
 */
export async function submitKYCData(
  stellarAddress: string,
  authToken: string,
  formData: KYCFormData
): Promise<{ id: string; status: KYCStatus }> {
  const body = new FormData();

  // Add text fields
  Object.entries(formData).forEach(([key, value]) => {
    if (value && !(value instanceof File)) {
      body.append(key, value.toString());
    }
  });

  // Add file uploads
  if (formData.photo_id_front) {
    body.append("photo_id_front", formData.photo_id_front);
  }
  if (formData.photo_id_back) {
    body.append("photo_id_back", formData.photo_id_back);
  }
  if (formData.photo_proof_residence) {
    body.append("photo_proof_residence", formData.photo_proof_residence);
  }

  // Add account identifier
  body.append("account", stellarAddress);

  const response = await fetch(`${SEP12_BASE_URL}/customer`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to submit KYC data");
  }

  return await response.json();
}

/**
 * Delete customer data (GDPR compliance)
 */
export async function deleteCustomerData(
  stellarAddress: string,
  authToken: string
): Promise<void> {
  const response = await fetch(
    `${SEP12_BASE_URL}/customer/${stellarAddress}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to delete customer data");
  }
}

/**
 * Get required KYC fields for a specific anchor
 */
export async function getRequiredFields(
  authToken: string
): Promise<CustomerInfo> {
  const response = await fetch(`${SEP12_BASE_URL}/customer`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get required fields");
  }

  return await response.json();
}

/**
 * Map KYC status to user-friendly message
 */
export function getStatusMessage(status: KYCStatus): {
  message: string;
  color: string;
} {
  switch (status) {
    case "NEEDS_INFO":
      return {
        message: "Please complete your verification",
        color: "yellow",
      };
    case "PENDING":
    case "PROCESSING":
      return {
        message: "Verification in progress",
        color: "blue",
      };
    case "ACCEPTED":
      return {
        message: "Verified ✅",
        color: "green",
      };
    case "REJECTED":
      return {
        message: "Verification rejected - please resubmit",
        color: "red",
      };
    default:
      return {
        message: "Unknown status",
        color: "gray",
      };
  }
}
