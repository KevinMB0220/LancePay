"use client";

import { useState } from "react";
import { KYCStatus, getStatusMessage } from "@/lib/sep12-kyc";

interface KYCVerificationFormProps {
  currentStatus?: KYCStatus;
  onSubmit: (formData: FormData) => Promise<void>;
}

export function KYCVerificationForm({
  currentStatus,
  onSubmit,
}: KYCVerificationFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const statusInfo = currentStatus
    ? getStatusMessage(currentStatus)
    : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Identity Verification</h2>
        {statusInfo && (
          <div
            className={`inline-block px-3 py-1 rounded text-sm bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}
          >
            {statusInfo.message}
          </div>
        )}
      </div>

      {currentStatus === "ACCEPTED" ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-green-800 font-semibold">
            Your identity has been verified
          </p>
          <p className="text-sm text-green-600 mt-2">
            You can now access higher withdrawal limits
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Step 1: Personal Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <input
                  name="first_name"
                  placeholder="First Name"
                  required
                  className="px-3 py-2 border rounded"
                />
                <input
                  name="last_name"
                  placeholder="Last Name"
                  required
                  className="px-3 py-2 border rounded"
                />
              </div>

              <input
                name="email_address"
                type="email"
                placeholder="Email Address"
                required
                className="w-full px-3 py-2 border rounded"
              />

              <input
                name="phone_number"
                type="tel"
                placeholder="Phone Number"
                className="w-full px-3 py-2 border rounded"
              />

              <input
                name="birth_date"
                type="date"
                placeholder="Date of Birth"
                className="w-full px-3 py-2 border rounded"
              />

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
              >
                Next: Address
              </button>
            </div>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Step 2: Address</h3>

              <input
                name="address_line_1"
                placeholder="Street Address"
                className="w-full px-3 py-2 border rounded"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  name="address_city"
                  placeholder="City"
                  className="px-3 py-2 border rounded"
                />
                <select
                  name="address_country_code"
                  required
                  className="px-3 py-2 border rounded"
                >
                  <option value="">Select Country</option>
                  <option value="NG">Nigeria</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border py-2 rounded hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                >
                  Next: Documents
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Documents */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Step 3: Identity Documents</h3>

              <select
                name="id_type"
                className="w-full px-3 py-2 border rounded"
              >
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="national_id">National ID</option>
              </select>

              <input
                name="id_number"
                placeholder="ID Number"
                className="w-full px-3 py-2 border rounded"
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  ID Front Photo
                </label>
                <input
                  name="photo_id_front"
                  type="file"
                  accept="image/*"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  ID Back Photo (if applicable)
                </label>
                <input
                  name="photo_id_back"
                  type="file"
                  accept="image/*"
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Proof of Residence
                </label>
                <input
                  name="photo_proof_residence"
                  type="file"
                  accept="image/*"
                  className="w-full"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 border py-2 rounded hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit for Verification"}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
        <strong>Privacy Note:</strong> Your information is sent via encrypted
        channels (HTTPS) to our compliance partner. We never store your ID
        documents on our servers.
      </div>
    </div>
  );
}
