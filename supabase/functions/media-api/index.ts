import { adminClient, handleOptions, json, requireUser } from "../_shared/server.ts";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "audio/mpeg", "audio/mp4", "video/mp4"]);

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const user = await requireUser(req);
    const admin = adminClient();
    const input = await req.json();

    if (input.action === "create-upload") {
      const { memoryId, fileName, contentType, sizeBytes } = input;
      if (typeof memoryId !== "string" || typeof fileName !== "string" || !ALLOWED_TYPES.has(contentType) || !Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_BYTES) {
        return json({ error: "Unsupported file or file size. Maximum size is 25 MB." }, 400);
      }
      const { data: memory, error: memoryError } = await admin.from("memories").select("id").eq("id", memoryId).eq("owner_id", user.id).maybeSingle();
      if (memoryError) throw memoryError;
      if (!memory) return json({ error: "Memory not found." }, 404);
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "attachment";
      const path = user.id + "/" + memoryId + "/" + crypto.randomUUID() + "-" + safeName;
      const { data: signed, error: signError } = await admin.storage.from("everstar-private").createSignedUploadUrl(path);
      if (signError) throw signError;
      const { data: attachment, error: insertError } = await admin.from("memory_attachments").insert({
        owner_id: user.id, memory_id: memoryId, object_path: path, file_name: fileName.slice(0, 255),
        content_type: contentType, size_bytes: sizeBytes
      }).select("id").single();
      if (insertError) throw insertError;
      return json({ path, token: signed.token, attachmentId: attachment.id });
    }

    if (input.action === "list") {
      const { memoryId } = input;
      const { data: memory, error: memoryError } = await admin.from("memories").select("id, unlock_at").eq("id", memoryId).eq("owner_id", user.id).maybeSingle();
      if (memoryError) throw memoryError;
      if (!memory) return json({ error: "Memory not found." }, 404);
      if (new Date(memory.unlock_at).getTime() > Date.now()) return json({ error: "This time capsule is still sealed." }, 423);
      const { data, error } = await admin.from("memory_attachments").select("id, file_name, content_type, size_bytes, object_path").eq("memory_id", memoryId).eq("owner_id", user.id);
      if (error) throw error;
      const items = await Promise.all((data || []).map(async (item) => {
        const { data: signed, error: signError } = await admin.storage.from("everstar-private").createSignedUrl(item.object_path, 60);
        if (signError) throw signError;
        return { id: item.id, fileName: item.file_name, contentType: item.content_type, sizeBytes: item.size_bytes, url: signed.signedUrl };
      }));
      return json({ attachments: items });
    }

    if (input.action === "delete") {
      const { attachmentId } = input;
      const { data: item, error } = await admin.from("memory_attachments").select("id, object_path").eq("id", attachmentId).eq("owner_id", user.id).maybeSingle();
      if (error) throw error;
      if (!item) return json({ error: "Attachment not found." }, 404);
      await admin.storage.from("everstar-private").remove([item.object_path]);
      await admin.from("memory_attachments").delete().eq("id", item.id).eq("owner_id", user.id);
      return json({ ok: true });
    }
    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("media-api:", error);
    return json({ error: "The attachment request could not be completed." }, 500);
  }
});
