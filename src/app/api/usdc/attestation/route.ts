import { NextResponse } from "next/server";
import attestation from "@/data/usdc-attestation.json";

export const revalidate = 3600;

export async function GET() {
  const attestedMs = new Date(attestation.attestedAt).getTime();
  const ageSeconds = Math.floor((Date.now() - attestedMs) / 1000);

  return NextResponse.json(
    {
      ...attestation,
      ageSeconds,
      porFeedAddress: null,
      porFeedNote: "No Chainlink PoR feed for native USDC on Ethereum mainnet. Circle attests via Deloitte monthly.",
    },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" } },
  );
}
