// Computes what it would take to put `current` back into the exact shape of
// `snapshot` — i.e. to undo every change made since the snapshot was taken.
//
// Change detection is JSON.stringify-based, matching production
// (index.html:845). That is technically key-order sensitive, so two objects
// holding identical data in a different insertion order would be reported as
// "changed". In practice every value here is produced by the same handful of
// code paths (a spread of a previous value plus a patch), so ordering is
// stable — and the only cost of a false positive is one redundant write of
// an identical value, never data loss.
export function computeSessionRestore(snapshot, current) {
  const writes = [];
  const deletes = [];
  const allKeys = new Set([...Object.keys(snapshot), ...Object.keys(current)]);

  for (const key of allKeys) {
    const before = snapshot[key];
    const now = current[key];
    if (JSON.stringify(before) === JSON.stringify(now)) continue;
    if (before === undefined) deletes.push(key);
    // Deep-copied so a caller mutating the returned value can never write
    // back through into the still-live session snapshot.
    else writes.push([key, JSON.parse(JSON.stringify(before))]);
  }

  return { writes, deletes };
}
