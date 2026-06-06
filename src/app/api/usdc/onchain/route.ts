import { NextResponse } from "next/server";
import { fetchOnchainSnapshot } from "@/lib/eth-rpc";

// Cache the heavy RPC fan-out for 60 s server-side
export const revalidate = 60;

export async function GET() {
  try {
    const snapshot = await fetchOnchainSnapshot();
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "RPC fetch failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
