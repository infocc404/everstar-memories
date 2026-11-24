export function isUnlockDateValid(memoryDate, unlockDate) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(memoryDate || '') || !/^\\d{4}-\\d{2}-\\d{2}$/.test(unlockDate || '')) return false;
  const memory = new Date(memoryDate + 'T12:00:00Z');
  const unlock = new Date(unlockDate + 'T12:00:00Z');
  return Number.isFinite(memory.getTime()) && Number.isFinite(unlock.getTime()) &&
    memory.toISOString().slice(0, 10) === memoryDate &&
    unlock.toISOString().slice(0, 10) === unlockDate &&
    unlock >= memory;
}
