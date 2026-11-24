import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKET = "memory-attachments";
const ALLOWED_ORIGINS = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "http://localhost:5173,https://infocc404.github.io")
  .split(",").map((v) => v.trim()).filter(Boolean);

const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const authClient = createClient(URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

function cors(origin: string | null) {
  const h: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}
function reply(data: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
const allowedTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "application/pdf",
]);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return reply({ error: "Origin not allowed" }, 403, origin);

  try {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return reply({ error: "Authentication required" }, 401, origin);
    const { data: userData, error: authError } = await authClient.auth.getUser(token);
    const user = userData.user;
    if (authError || !user) return reply({ error: "Invalid session" }, 401, origin);

    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const base = parts.indexOf("media-api");
    const route = base >= 0 ? parts.slice(base + 1) : [];
    const resource = route[0] ?? "";
    const id = route[1] ?? "";

    if (resource !== "attachments") return reply({ error: "Not found" }, 404, origin);

    if (req.method === "POST" && !id) {
      const body = await req.json();
      const memoryId = typeof body.memoryId === "string" ? body.memoryId : "";
      const fileName = typeof body.fileName === "string" ? body.fileName.slice(0, 240) : "";
      const contentType = typeof body.contentType === "string" ? body.contentType : "";
      const sizeBytes = Number(body.sizeBytes);
      if (!memoryId || !fileName || !allowedTypes.has(contentType) ||
          !Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > 26214400) {
        return reply({ error: "Invalid attachment metadata or file size/type." }, 400, origin);
      }
      const { data: memory, error: memoryError } = await admin.from("memories")
        .select("id").eq("id", memoryId).eq("user_id", user.id).maybeSingle();
      if (memoryError) throw memoryError;
      if (!memory) return reply({ error: "Memory not found" }, 404, origin);

      const objectPath = user.id + "/" + memoryId + "/" + crypto.randomUUID();
      const { data: signed, error: signedError } = await admin.storage.from(BUCKET).createSignedUploadUrl(objectPath);
      if (signedError) throw signedError;
      const { data: attachment, error: insertError } = await admin.from("memory_attachments").insert({
        user_id: user.id, memory_id: memoryId, object_path: objectPath,
        file_name: fileName, content_type: contentType, size_bytes: sizeBytes,
      }).select("id").single();
      if (insertError) {
        await admin.storage.from(BUCKET).remove([objectPath]);
        throw insertError;
      }
      return reply({ attachmentId: attachment.id, path: signed.path, token: signed.token }, 201, origin);
    }

    if (req.method === "GET" && !id) {
      const memoryId = url.searchParams.get("memoryId") ?? "";
      if (!memoryId) return reply({ error: "memoryId is required" }, 400, origin);
      const { data: memory, error: memoryError } = await admin.from("memories")
        .select("id,unlock_at").eq("id", memoryId).eq("user_id", user.id).maybeSingle();
      if (memoryError) throw memoryError;
      if (!memory) return reply({ error: "Memory not found" }, 404, origin);
      if (memory.unlock_at && new Date(memory.unlock_at).getTime() > Date.now()) {
        return reply({ error: "This capsule is still locked", unlockAt: memory.unlock_at }, 423, origin);
      }
      const { data: rows, error } = await admin.from("memory_attachments")
        .select("id,file_name,content_type,size_bytes,created_at,object_path")
        .eq("user_id", user.id).eq("memory_id", memoryId).order("created_at", { ascending: true });
      if (error) throw error;
      const attachments = await Promise.all((rows ?? []).map(async (row) => {
        const { data: signed, error: signError } = await admin.storage.from(BUCKET).createSignedUrl(row.object_path, 60);
        if (signError) throw signError;
        return { id: row.id, fileName: row.file_name, contentType: row.content_type,
          sizeBytes: row.size_bytes, url: signed.signedUrl };
      }));
      return reply({ attachments }, 200, origin);
    }

    if (req.method === "DELETE" && id) {
      const { data: row, error } = await admin.from("memory_attachments")
        .select("id,object_path").eq("id", id).eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (!row) return reply({ error: "Attachment not found" }, 404, origin);
      const { error: storageError } = await admin.storage.from(BUCKET).remove([row.object_path]);
      if (storageError) throw storageError;
      const { error: deleteError } = await admin.from("memory_attachments").delete()
        .eq("id", id).eq("user_id", user.id);
      if (deleteError) throw deleteError;
      return reply({ deleted: true }, 200, origin);
    }

    return reply({ error: "Method not allowed" }, 405, origin);
  } catch (error) {
    console.error("media-api error", error instanceof Error ? error.message : "Unexpected error");
    return reply({ error: "Attachment request could not be completed." }, 500, origin);
  }
});
