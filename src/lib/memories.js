import { supabase } from './supabase';

async function callMemoryApi(payload) {
  if (!supabase) throw new Error('The secure backend is not configured yet.');
  const { data, error } = await supabase.functions.invoke('memory-api', { body: payload });
  if (error) {
    const message = data?.error || error.message || 'Memory service unavailable.';
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const listMemories = () => callMemoryApi({ action: 'list' });
export const createMemory = (memory) => callMemoryApi({ action: 'create', ...memory });
export const getMemory = (id) => callMemoryApi({ action: 'get', id });
export const deleteMemory = (id) => callMemoryApi({ action: 'delete', id });

export async function uploadAttachment(memoryId, file) {
  if (!supabase) throw new Error('The secure backend is not configured yet.');
  const { data, error } = await supabase.functions.invoke('media-api', {
    body: { action: 'create-upload', memoryId, fileName: file.name, contentType: file.type, sizeBytes: file.size },
  });
  if (error || data?.error) throw new Error(data?.error || error.message);
  const { error: uploadError } = await supabase.storage.from('everstar-private').uploadToSignedUrl(data.path, data.token, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    await supabase.functions.invoke('media-api', { body: { action: 'delete', attachmentId: data.attachmentId } });
    throw uploadError;
  }
  return data.attachmentId;
}

export async function listAttachments(memoryId) {
  if (!supabase) throw new Error('The secure backend is not configured yet.');
  const { data, error } = await supabase.functions.invoke('media-api', { body: { action: 'list', memoryId } });
  if (error || data?.error) throw new Error(data?.error || error.message);
  return data.attachments || [];
}
