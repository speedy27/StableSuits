import { NextResponse } from "next/server";

export const revalidate = 30;

// Proxy to Binance public API to avoid CORS in the browser
export async function GET() {
  try {
    const url =
      "https://api.binance.com/api/v3/ticker/price?symbol=USDCUSDT";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
    const data = (await res.json()) as { symbol: string; price: string };
    return NextResponse.json(
      { symbol: data.symbol, price: parseFloat(data.price), fetchedAt: Date.now() },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=15" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Binance fetch failed";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
