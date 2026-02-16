// lib/kv.ts
import { Redis } from "@upstash/redis";

// Prefer explicit UPSTASH_* (your local .env), but also support Vercel KV_* in prod.
const url =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.KV_REST_API_URL; // (same, just explicit)

const token =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN; // IMPORTANT: use write token, NOT READ_ONLY

export const kv = url && token ? new Redis({ url, token }) : null;

export function kvReady() {
  return !!kv;
}

// Optional: helps debug in routes
export function kvEnvDebug() {
  return {
    hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    hasKvUrl: !!process.env.KV_REST_API_URL,
    hasKvToken: !!process.env.KV_REST_API_TOKEN,
    kvReady: !!kv,
  };
}