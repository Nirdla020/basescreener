export async function getEthUsdPrice(): Promise<number> {
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { cache: "no-store" }
    );

    const j = await r.json();

    return Number(j?.ethereum?.usd || 0);
  } catch (e) {
    console.error("ETH price fetch failed:", e);
    return 0;
  }
}