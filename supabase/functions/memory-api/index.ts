import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ENCRYPTION_KEY_B64 = Deno.env.get("ENCRYPTION_KEY") ?? "";
const ALLOWED_ORIGINS = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "http://localhost:5173,https://infocc404.github.io")
  .split(",").map((s) => s.trim()).filter(Boolean);

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, PATCH, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
function encodeBase64(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}
async function getEncryptionKey(): Promise<CryptoKey> {
  if (!ENCRYPTION_KEY_B64) throw new Error("ENCRYPTION_KEY_NOT_CONFIGURED");
  const raw = decodeBase64(ENCRYPTION_KEY_B64);
  if (raw.length !== 32) throw new Error("ENCRYPTION_KEY_MUST_BE_32_BYTES_BASE64");
  return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptContent(content: string, userId: string, memoryId: string) {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode(userId + ":" + memoryId);
  const plain = new TextEncoder().encode(content);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad, tagLength: 128 }, key, plain));
  return { v: 1, alg: "A256GCM", iv: encodeBase64(iv), ciphertext: encodeBase64(encrypted) };
}
async function decryptContent(payload: any, userId: string, memoryId: string): Promise<string> {
  if (!payload || payload.v !== 1 || payload.alg !== "A256GCM" || typeof payload.iv !== "string" || typeof payload.ciphertext !== "string") {
    throw new Error("INVALID_ENCRYPTED_PAYLOAD");
  }
  const key = await getEncryptionKey();
  const iv = decodeBase64(payload.iv);
  const ciphertext = decodeBase64(payload.ciphertext);
  const aad = new TextEncoder().encode(userId + ":" + memoryId);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad, tagLength: 128 }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return json({ error: "Origin not allowed" }, 403, origin);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Authentication required" }, 401, origin);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    const user = userData.user;
    if (userError || !user) return json({ error: "Invalid session" }, 401, origin);

    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const route = parts.slice(parts.indexOf("memory-api") + 1);
    const resource = route[0] ?? "";
    const id = route[1] ?? "";

    if (resource === "memories" && req.method === "GET" && !id) {
      const { data, error } = await admin.from("memories")
        .select("id,title,memory_date,mood,color,unlock_at,created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return json({ memories: data ?? [] }, 200, origin);
    }

    if (resource === "memories" && req.method === "POST" && !id) {
      const length = Number(req.headers.get("content-length") ?? "0");
      if (length > 300000) return json({ error: "Request too large" }, 413, origin);
      const body = await req.json();
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const content = typeof body.content === "string" ? body.content : "";
      const unlockAt = body.unlockAt ?? null;
      const memoryDate = typeof body.memoryDate === "string" ? body.memoryDate : "";
      const mood = typeof body.mood === "string" ? body.mood : "Hopeful";
      const color = typeof body.color === "string" ? body.color : "#e6bd79";
      if (!title || title.length > 160 || !content.trim() || content.length > 200000 ||
          !/^\d{4}-\d{2}-\d{2}$/.test(memoryDate) || mood.length < 1 || mood.length > 32 || !/^#[0-9a-fA-F]{6}$/.test(color)) {
        return json({ error: "Title (1–160 characters) and content (1–200000 characters) are required" }, 400, origin);
      }
      let unlockDate: string | null = null;
      if (unlockAt !== null) {
        const date = new Date(unlockAt);
        if (!Number.isFinite(date.getTime())) return json({ error: "Invalid unlock date" }, 400, origin);
        unlockDate = date.toISOString();
      }
      const memoryId = crypto.randomUUID();
      const encrypted = await encryptContent(content, user.id, memoryId);
      const { data, error } = await admin.from("memories").insert({
        id: memoryId, user_id: user.id, title, encrypted_content: encrypted, unlock_at: unlockDate,
        memory_date: memoryDate, mood, color,
      }).select("id,title,unlock_at,created_at").single();
      if (error) throw error;
      return json({ memory: data }, 201, origin);
    }

    if (resource === "memories" && req.method === "GET" && id) {
      const { data: memory, error } = await admin.from("memories")
        .select("id,user_id,title,encrypted_content,memory_date,mood,color,unlock_at,created_at")
        .eq("id", id).eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (!memory) return json({ error: "Memory not found" }, 404, origin);
      if (memory.unlock_at && new Date(memory.unlock_at).getTime() > Date.now()) {
        return json({ error: "This capsule is still locked", unlockAt: memory.unlock_at }, 423, origin);
      }
      const content = await decryptContent(memory.encrypted_content, user.id, memory.id);
      return json({ memory: { id: memory.id, title: memory.title, content, memoryDate: memory.memory_date, mood: memory.mood, color: memory.color, unlockAt: memory.unlock_at, createdAt: memory.created_at } }, 200, origin);
    }

    if (resource === "memories" && req.method === "DELETE" && id) {
      const { data, error } = await admin.from("memories").delete()
        .eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Memory not found" }, 404, origin);
      return json({ deleted: true }, 200, origin);
    }

    if (resource === "notifications" && req.method === "GET") {
      const { data, error } = await admin.from("notifications").select("id,type,title,body,read_at,created_at,memory_id")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return json({ notifications: data ?? [] }, 200, origin);
    }

    if (resource === "notifications" && id && req.method === "PATCH") {
      const { data, error } = await admin.from("notifications").update({ read_at: new Date().toISOString() })
        .eq("id", id).eq("user_id", user.id).select("id,read_at").maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Notification not found" }, 404, origin);
      return json({ notification: data }, 200, origin);
    }

    return json({ error: "Not found" }, 404, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message.includes("ENCRYPTION_KEY")) {
      return json({ error: "Server encryption is not configured. Set ENCRYPTION_KEY in Edge Function secrets." }, 503, origin);
    }
    console.error("memory-api error", message);
    return json({ error: "Request could not be completed" }, 500, origin);
  }
});