import type { RandomSource } from '../types';

export function createRng(seed: number): RandomSource {
  let state = seed >>> 0;
  const next = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    integer(minInclusive, maxExclusive) {
      return Math.floor(next() * (maxExclusive - minInclusive)) + minInclusive;
    },
    pick(items) {
      if (items.length === 0) throw new Error('Cannot pick from an empty array');
      return items[Math.floor(next() * items.length)]!;
    },
  };
}
