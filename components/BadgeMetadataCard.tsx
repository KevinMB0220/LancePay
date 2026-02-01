"use client";

import { useEffect, useState } from "react";
import { LancePayBadgeMetadata } from "@/lib/sep68-metadata";

interface BadgeMetadataCardProps {
  issuerAddress: string;
  assetCode: string;
}

export function BadgeMetadataCard({
  issuerAddress,
  assetCode,
}: BadgeMetadataCardProps) {
  const [metadata, setMetadata] = useState<LancePayBadgeMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, [issuerAddress, assetCode]);

  const fetchMetadata = async () => {
    try {
      const response = await fetch(
        `/api/routes-d/badges/metadata?issuer=${issuerAddress}&code=${assetCode}`
      );

      if (response.ok) {
        const data = await response.json();
        setMetadata(data.metadata);
        setIsLocked(data.isLocked);
      }
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-48 rounded-lg"></div>;
  }

  if (!metadata) {
    return (
      <div className="border rounded-lg p-4 text-center text-gray-500">
        No metadata available
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Badge Image */}
      {metadata.image && (
        <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <img
            src={metadata.image}
            alt={metadata.name}
            className="max-h-full max-w-full object-contain p-4"
          />
        </div>
      )}

      {/* Badge Details */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg">{metadata.name}</h3>
          {isLocked && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              🔒 Locked
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-4">{metadata.description}</p>

        {/* Attributes */}
        {metadata.attributes && metadata.attributes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Attributes:</h4>
            <div className="grid grid-cols-2 gap-2">
              {metadata.attributes.map((attr, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 rounded p-2 text-sm"
                >
                  <div className="text-gray-500 text-xs">{attr.trait_type}</div>
                  <div className="font-medium">{attr.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External Link */}
        {metadata.external_url && (
          <a
            href={metadata.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block text-center text-sm text-blue-600 hover:underline"
          >
            View on LancePay →
          </a>
        )}
      </div>

      {/* SEP-68 Badge */}
      <div className="bg-gray-50 px-4 py-2 border-t text-center">
        <span className="text-xs text-gray-500">
          SEP-68 Compliant Badge • Verified On-Chain
        </span>
      </div>
    </div>
  );
}
