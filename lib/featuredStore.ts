// lib/featuredStore.ts
import { kv } from "./kv";

/* ================== TYPES ================== */

export type FeaturedItem = {
  chainId: number; // 8453
  address: string;
  title?: string;
  weight?: number;
  promoted?: boolean;
  createdAt: string;
  expiresAt: string;
  paidTxHash?: string;
  payer?: string;
};

export type PaymentEvent = {
  ts: string;
  tokenAddress: string;
  title?: string;
  days: number;
  usd: number;
  ethUsd: number;
  amountWei: string;
  txHash: string;
  payer?: string;
};

/* ================== KEYS ================== */

const KEY_FEATURED = "featured:items";
const KEY_PAYMENTS = "featured:payments";
const KEY_USED_TX = "featured:usedTx";

/* ================== HELPERS ================== */

function hasKV() {
  return !!kv;
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    if (!hasKV()) return fallback;
    return await fn();
  } catch (e) {
    console.error("[featuredStore] KV error:", e);
    return fallback;
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function addDaysIso(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function itemKey(chainId: number, address: string) {
  return `${chainId}:${address.toLowerCase()}`;
}

/* ================== FEATURED ================== */

export async function upsertFeatured(item: FeaturedItem) {
  const key = itemKey(item.chainId, item.address);

  await safe(
    () => kv!.hset(KEY_FEATURED, { [key]: JSON.stringify(item) }) as any,
    null as any
  );
}

export async function removeFeatured(chainId: number, address: string) {
  const key = itemKey(chainId, address);

  await safe(() => kv!.hdel(KEY_FEATURED, key) as any, null as any);
}

export async function listFeatured(): Promise<FeaturedItem[]> {
  const map = await safe(
    () => kv!.hgetall<Record<string, string>>(KEY_FEATURED) as any,
    {} as Record<string, string>
  );

  const items = Object.values(map || {})
    .map((s) => {
      try {
        return JSON.parse(s) as FeaturedItem;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as FeaturedItem[];

  // Auto-remove expired
  const now = Date.now();

  return items.filter((it) => {
    const exp = Date.parse(it.expiresAt || "");
    return Number.isFinite(exp) ? exp > now : true;
  });
}

/* ================== TX TRACKING ================== */

export async function markTxUsed(txHash: string) {
  await safe(
    () => kv!.sadd(KEY_USED_TX, txHash.toLowerCase()) as any,
    null as any
  );
}

export async function isTxUsed(txHash: string) {
  const used = await safe(
    () => kv!.sismember(KEY_USED_TX, txHash.toLowerCase()) as any,
    0 as any
  );

  return !!used;
}

/* ================== PAYMENTS ================== */

export async function logPayment(ev: PaymentEvent) {
  await safe(
    () => kv!.lpush(KEY_PAYMENTS, JSON.stringify(ev)) as any,
    null as any
  );

  // Keep last 500
  await safe(() => kv!.ltrim(KEY_PAYMENTS, 0, 499) as any, null as any);
}

export async function listPayments(limit = 100): Promise<PaymentEvent[]> {
  const raw = await safe(
    () =>
      kv!.lrange<string>(
        KEY_PAYMENTS,
        0,
        Math.max(0, limit - 1)
      ) as any,
    [] as string[]
  );

  return (raw || [])
    .map((s) => {
      try {
        return JSON.parse(s) as PaymentEvent;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as PaymentEvent[];
}