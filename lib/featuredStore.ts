// lib/featuredStore.ts
import { kv } from "@/lib/kv";

/* ================== TYPES ================== */

export type FeaturedItem = {
  chainId: number; // 8453
  address: string;
  title?: string;
  logoUrl?: string;

  weight?: number;
  promoted?: boolean;

  createdAt: string; // ISO
  expiresAt: string; // ISO
  paidTxHash?: string;
  payer?: string;
};

export type PaymentEvent = {
  ts: string; // ISO
  tokenAddress: string;
  title?: string;
  days: number;
  usd: number;
  ethUsd: number;
  amountWei: string;
  txHash: string;
  payer?: string;
};

export type EarningsSummary = {
  count: number;
  totalUsd: number;
  totalWei: string;
  uniquePayers: number;
  uniqueTokens: number;
  lastPaymentTs?: string;

  byPayerUsd: Array<{ payer: string; usd: number; count: number }>;
  byTokenUsd: Array<{ tokenAddress: string; usd: number; count: number }>;
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

function safeJsonParse<T>(v: any): T | null {
  try {
    if (typeof v === "string") return JSON.parse(v) as T;
    // sometimes libs return already-parsed objects
    if (v && typeof v === "object") return v as T;
    return null;
  } catch {
    return null;
  }
}

function isAddr(a?: string) {
  return !!a && /^0x[a-fA-F0-9]{40}$/.test(String(a || "").trim());
}

function toBigIntSafe(v: any): bigint {
  try {
    if (typeof v === "bigint") return v;
    if (typeof v === "number" && Number.isFinite(v)) return BigInt(Math.floor(v));
    if (typeof v === "string" && v.trim()) return BigInt(v.trim());
    return BigInt(0);
  } catch {
    return BigInt(0);
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
  return `${chainId}:${String(address).toLowerCase()}`;
}

/* ================== FEATURED ================== */

export async function upsertFeatured(item: FeaturedItem) {
  const key = itemKey(item.chainId, item.address);

  await safe(
    async () => {
      await (kv as any).hset(KEY_FEATURED, { [key]: JSON.stringify(item) });
      return true;
    },
    false
  );
}

export async function removeFeatured(chainId: number, address: string) {
  const key = itemKey(chainId, address);

  await safe(
    async () => {
      await (kv as any).hdel(KEY_FEATURED, key);
      return true;
    },
    false
  );
}

export async function listFeatured(): Promise<FeaturedItem[]> {
  // Upstash hgetall sometimes returns:
  //  - Record<string, string>
  //  - Array<[string, string]>
  const raw = await safe(() => (kv as any).hgetall(KEY_FEATURED), null as any);

  let map: Record<string, any> = {};

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    map = raw as Record<string, any>;
  } else if (Array.isArray(raw)) {
    // convert [ [k,v], [k,v] ] -> { k: v }
    map = Object.fromEntries(raw as any);
  } else {
    map = {};
  }

  const items = Object.values(map)
    .map((v) => safeJsonParse<FeaturedItem>(v))
    .filter(Boolean) as FeaturedItem[];

  const now = Date.now();

  // IMPORTANT: some older records might have expiresAt as YYYY-MM-DD.
  // We'll accept both ISO and YYYY-MM-DD.
  return items.filter((it) => {
    const s = String(it.expiresAt || "").trim();
    if (!s) return true;

    // If it's YYYY-MM-DD, treat as end of day PH time (+08:00)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const end = Date.parse(`${s}T23:59:59.999+08:00`);
      return Number.isFinite(end) ? end > now : true;
    }

    const exp = Date.parse(s);
    return Number.isFinite(exp) ? exp > now : true;
  });
}

/* ================== TX TRACKING ================== */

export async function markTxUsed(txHash: string) {
  const h = String(txHash || "").toLowerCase();
  if (!h) return;

  await safe(async () => {
    await (kv as any).sadd(KEY_USED_TX, h);
    return true;
  }, false);
}

export async function isTxUsed(txHash: string) {
  const h = String(txHash || "").toLowerCase();
  if (!h) return false;

  const used = await safe(() => (kv as any).sismember(KEY_USED_TX, h), 0 as any);
  return !!used;
}

/* ================== PAYMENTS ================== */

export async function logPayment(ev: PaymentEvent) {
  await safe(async () => {
    await (kv as any).lpush(KEY_PAYMENTS, JSON.stringify(ev));
    await (kv as any).ltrim(KEY_PAYMENTS, 0, 499);
    return true;
  }, false);
}

export async function listPayments(limit = 100): Promise<PaymentEvent[]> {
  const raw = await safe(
    () => (kv as any).lrange(KEY_PAYMENTS, 0, Math.max(0, limit - 1)),
    [] as any[]
  );

  return (raw || [])
    .map((v: any) => safeJsonParse<PaymentEvent>(v))
    .filter(Boolean) as PaymentEvent[];
}

/* ================== EARNINGS ================== */

export async function getEarningsSummary(limit = 500): Promise<EarningsSummary> {
  const payments = await listPayments(Math.min(500, Math.max(1, limit)));

  let totalUsd = 0;
  let totalWei = BigInt(0);

  const payers = new Set<string>();
  const tokens = new Set<string>();

  const byPayer = new Map<string, { usd: number; count: number }>();
  const byToken = new Map<string, { usd: number; count: number }>();

  let lastTs: string | undefined;

  for (const p of payments) {
    const usd = typeof p.usd === "number" && Number.isFinite(p.usd) ? p.usd : 0;
    totalUsd += usd;

    totalWei = totalWei + toBigIntSafe(p.amountWei);

    const payer = (p.payer || "").toLowerCase();
    if (payer) payers.add(payer);

    const token = (p.tokenAddress || "").toLowerCase();
    if (isAddr(token)) tokens.add(token);

    if (payer) {
      const cur = byPayer.get(payer) || { usd: 0, count: 0 };
      cur.usd += usd;
      cur.count += 1;
      byPayer.set(payer, cur);
    }

    if (token) {
      const cur = byToken.get(token) || { usd: 0, count: 0 };
      cur.usd += usd;
      cur.count += 1;
      byToken.set(token, cur);
    }

    if (!lastTs || Date.parse(p.ts) > Date.parse(lastTs)) lastTs = p.ts;
  }

  const byPayerUsd = Array.from(byPayer.entries())
    .map(([payer, v]) => ({ payer, usd: v.usd, count: v.count }))
    .sort((a, b) => b.usd - a.usd);

  const byTokenUsd = Array.from(byToken.entries())
    .map(([tokenAddress, v]) => ({ tokenAddress, usd: v.usd, count: v.count }))
    .sort((a, b) => b.usd - a.usd);

  return {
    count: payments.length,
    totalUsd,
    totalWei: totalWei.toString(),
    uniquePayers: payers.size,
    uniqueTokens: tokens.size,
    lastPaymentTs: lastTs,
    byPayerUsd,
    byTokenUsd,
  };
}