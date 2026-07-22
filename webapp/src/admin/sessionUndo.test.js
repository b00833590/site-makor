import { describe, it, expect } from 'vitest';
import { computeSessionRestore } from './sessionUndo.js';

describe('computeSessionRestore', () => {
  it('returns nothing to do when nothing changed', () => {
    const db = { 'mkg:week:w1': { id: 'w1', label: 'Semaine 1', order: 0 } };
    expect(computeSessionRestore(db, { ...db })).toEqual({ writes: [], deletes: [] });
  });

  it('restores an edited document to its snapshot value', () => {
    const snapshot = { 'mkg:market:w1:i1': { id: 'i1', name: 'CAC 40', value: '7 500' } };
    const current = { 'mkg:market:w1:i1': { id: 'i1', name: 'CAC 40', value: '9 999' } };
    expect(computeSessionRestore(snapshot, current)).toEqual({
      writes: [['mkg:market:w1:i1', { id: 'i1', name: 'CAC 40', value: '7 500' }]],
      deletes: [],
    });
  });

  it('deletes a document that did not exist at snapshot time (an add to undo)', () => {
    const snapshot = {};
    const current = { 'mkg:market:w1:new': { id: 'new', name: 'Nouvel indice' } };
    expect(computeSessionRestore(snapshot, current)).toEqual({
      writes: [],
      deletes: ['mkg:market:w1:new'],
    });
  });

  it('re-writes a document that was deleted during the session (a delete to undo)', () => {
    const snapshot = { 'mkg:market:w1:i1': { id: 'i1', name: 'CAC 40' } };
    const current = {};
    expect(computeSessionRestore(snapshot, current)).toEqual({
      writes: [['mkg:market:w1:i1', { id: 'i1', name: 'CAC 40' }]],
      deletes: [],
    });
  });

  it('handles edits, adds, and deletes together in one session', () => {
    const snapshot = {
      'mkg:market:w1:edited': { id: 'edited', value: 'avant' },
      'mkg:market:w1:removed': { id: 'removed', value: 'existait' },
      'mkg:market:w1:untouched': { id: 'untouched', value: 'stable' },
    };
    const current = {
      'mkg:market:w1:edited': { id: 'edited', value: 'après' },
      'mkg:market:w1:untouched': { id: 'untouched', value: 'stable' },
      'mkg:market:w1:added': { id: 'added', value: 'nouveau' },
    };
    const result = computeSessionRestore(snapshot, current);
    expect(result.writes.sort()).toEqual([
      ['mkg:market:w1:edited', { id: 'edited', value: 'avant' }],
      ['mkg:market:w1:removed', { id: 'removed', value: 'existait' }],
    ].sort());
    expect(result.deletes).toEqual(['mkg:market:w1:added']);
  });

  it('never includes an untouched document in either list', () => {
    const snapshot = { a: { v: 1 }, b: { v: 2 } };
    const current = { a: { v: 1 }, b: { v: 99 } };
    const result = computeSessionRestore(snapshot, current);
    expect(result.writes).toEqual([['b', { v: 2 }]]);
    expect(result.deletes).toEqual([]);
  });

  it('detects a nested change (not just a top-level field)', () => {
    const snapshot = { c: { id: 'c', bullets: ['un', 'deux'] } };
    const current = { c: { id: 'c', bullets: ['un', 'deux', 'trois'] } };
    expect(computeSessionRestore(snapshot, current).writes).toEqual([
      ['c', { id: 'c', bullets: ['un', 'deux'] }],
    ]);
  });

  it('returns snapshot values by reference-independent copy semantics (mutating the result does not corrupt the snapshot)', () => {
    const snapshot = { a: { id: 'a', value: 'original' } };
    const current = { a: { id: 'a', value: 'modifié' } };
    const result = computeSessionRestore(snapshot, current);
    result.writes[0][1].value = 'muté';
    expect(snapshot.a.value).toBe('original');
  });
});
