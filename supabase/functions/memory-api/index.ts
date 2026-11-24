import { adminClient, handleOptions, json, requireUser } from "../_shared/server.ts";
import { decryptPayload, encryptPayload } from "../_shared/crypto.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const user = await requireUser(req);
    const admin = adminClient();
    const input = await req.json();
    const action = input?.action;

    if (action === "list") {
      const { data, error } = await admin.from("memories")
        .select("id, owner_id, encrypted_payload, unlock_at, created_at")
        .eq("owner_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      const now = Date.now();
      const items = await Promise.all((data || []).map(async (row) => {
        const unlocked = new Date(row.unlock_at).getTime() <= now;
        if (!unlocked) return { id: row.id, title: "Sealed memory", body: "", date: row.created_at, unlockAt: row.unlock_at, isLocked: true, attachments: [] };
        const payload = await decryptPayload(row.encrypted_payload);
        return { id: row.id, ...payload, date: payload.date || row.created_at, unlockAt: row.unlock_at, createdAt: row.created_at, isLocked: false };
      }));
      return json({ memories: items });
    }

    if (action === "create") {
      const { title, body, date, unlockAt, unlockDate, mood, color } = input;
      if (typeof title !== "string" || !title.trim() || typeof body !== "string" || !body.trim()) return json({ error: "A title and memory text are required." }, 400);
      const unlock = new Date(unlockAt);
      const happened = new Date(date);
      if (!Number.isFinite(unlock.getTime()) || !Number.isFinite(happened.getTime()) || typeof unlockDate !== 'string' || unlockDate < date) return json({ error: "Please choose valid dates. The opening date cannot be before the memory date." }, 400);
      const encrypted_payload = await encryptPayload({ title: title.trim(), body, date, mood: String(mood || "Hopeful"), color: String(color || "#e6bd79") });
      const { data, error } = await admin.from("memories").insert({ owner_id: user.id, encrypted_payload, unlock_at: unlock.toISOString() }).select("id, unlock_at, created_at").single();
      if (error) throw error;
      const isLocked = unlock.getTime() > Date.now();
      return json({ memory: { id: data.id, title: isLocked ? "Sealed memory" : title.trim(), body: isLocked ? "" : body, date, mood, color, unlockAt: data.unlock_at, createdAt: data.created_at, isLocked, attachments: [] } }, 201);
    }

    if (action === "get") {
      if (typeof input.id !== "string") return json({ error: "Memory id is required." }, 400);
      const { data, error } = await admin.from("memories").select("id, owner_id, encrypted_payload, unlock_at, created_at").eq("id", input.id).eq("owner_id", user.id).maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Memory not found." }, 404);
      if (new Date(data.unlock_at).getTime() > Date.now()) return json({ error: "This time capsule is still sealed.", unlockAt: data.unlock_at }, 423);
      const payload = await decryptPayload(data.encrypted_payload);
      return json({ memory: { id: data.id, ...payload, unlockAt: data.unlock_at, createdAt: data.created_at, isLocked: false } });
    }

    if (action === "delete") {
      if (typeof input.id !== "string") return json({ error: "Memory id is required." }, 400);
      const { data: attachments } = await admin.from("memory_attachments").select("object_path").eq("memory_id", input.id).eq("owner_id", user.id);
      if (attachments?.length) await admin.storage.from("everstar-private").remove(attachments.map((a) => a.object_path));
      const { data, error } = await admin.from("memories").delete().eq("id", input.id).eq("owner_id", user.id).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Memory not found." }, 404);
      return json({ ok: true });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("memory-api:", error);
    return json({ error: "The memory request could not be completed." }, 500);
  }
});
