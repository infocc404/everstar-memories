import { supabase } from './supabase';

async function invoke(path, options = {}) {
  if (!supabase) throw new Error('The secure backend is not configured yet.');
  const { data, error } = await supabase.functions.invoke(path, options);
  if (error) {
    const serverMessage = data?.error || error.context?.body?.error;
    throw new Error(serverMessage || error.message || 'The secure memory service is unavailable.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

function normalizeMemory(row) {
  const unlockAt = row.unlock_at ?? row.unlockAt ?? null;
  return {
    id: row.id,
    title: row.title,
    date: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    created_at: row.created_at ?? row.createdAt ?? null,
    unlockAt,
    isLocked: Boolean(unlockAt && new Date(unlockAt).getTime() > Date.now()),
    body: row.content ?? '',
    mood: 'Memory',
    color: '#e6bd79',
  };
}

export async function listMemories() {
  const data = await invoke('memory-api/memories', { method: 'GET' });
  return { memories: (data.memories || []).map(normalizeMemory) };
}

export async function createMemory(memory) {
  const unlockAt = memory.unlockDate
    ? new Date(`${memory.unlockDate}T00:00:00`).toISOString()
    : null;
  const data = await invoke('memory-api/memories', {
    method: 'POST',
    body: { title: memory.title, content: memory.body, unlockAt },
  });
  return { memory: normalizeMemory(data.memory) };
}

export async function getMemory(id) {
  const data = await invoke(`memory-api/memories/${encodeURIComponent(id)}`, { method: 'GET' });
  return { memory: normalizeMemory(data.memory) };
}

export async function deleteMemory(id) {
  return invoke(`memory-api/memories/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function uploadAttachment(memoryId, file) {
  if (!supabase) throw new Error('The secure backend is not configured yet.');
  const data = await invoke('media-api/attachments', {
    method: 'POST',
    body: { memoryId, fileName: file.name, contentType: file.type, sizeBytes: file.size },
  });
  const { error } = await supabase.storage.from('memory-attachments')
    .uploadToSignedUrl(data.path, data.token, file, { contentType: file.type, upsert: false });
  if (error) {
    await invoke(`media-api/attachments/${encodeURIComponent(data.attachmentId)}`, { method: 'DELETE' }).catch(() => {});
    throw error;
  }
  return data.attachmentId;
}

export async function listAttachments(memoryId) {
  const data = await invoke(`media-api/attachments?memoryId=${encodeURIComponent(memoryId)}`, { method: 'GET' });
  return data.attachments || [];
}
