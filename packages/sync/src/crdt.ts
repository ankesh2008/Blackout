import type { Report, VectorClock } from '@blackout/types';

export type ClockComparison = 'DOMINATES' | 'DOMINATED_BY' | 'EQUAL' | 'CONCURRENT';

/**
 * Vector Clock utilities for distributed, partition-tolerant causal ordering.
 */
export class VectorClockEngine {
  /**
   * Increments the clock for a specific node ID.
   */
  public static increment(clock: VectorClock, nodeId: string): VectorClock {
    return {
      ...clock,
      [nodeId]: (clock[nodeId] || 0) + 1,
    };
  }

  /**
   * Compares two vector clocks.
   * Returns:
   *  - 'DOMINATES' if a is strictly newer than b
   *  - 'DOMINATED_BY' if b is strictly newer than a
   *  - 'EQUAL' if all keys and values match
   *  - 'CONCURRENT' if neither clock dominates the other (divergent history)
   */
  public static compare(a: VectorClock, b: VectorClock): ClockComparison {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let aHasGreater = false;
    let bHasGreater = false;

    for (const key of keys) {
      const valA = a[key] || 0;
      const valB = b[key] || 0;

      if (valA > valB) aHasGreater = true;
      if (valB > valA) bHasGreater = true;
    }

    if (!aHasGreater && !bHasGreater) return 'EQUAL';
    if (aHasGreater && !bHasGreater) return 'DOMINATES';
    if (!aHasGreater && bHasGreater) return 'DOMINATED_BY';
    return 'CONCURRENT';
  }

  /**
   * Merges two vector clocks component-wise (pointwise supremum).
   */
  public static merge(a: VectorClock, b: VectorClock): VectorClock {
    const result: VectorClock = { ...a };
    for (const [key, val] of Object.entries(b)) {
      result[key] = Math.max(result[key] || 0, val);
    }
    return result;
  }
}

/**
 * CRDT conflict resolution engine for Emergency Reports.
 * Employs causal vector-clock ordering, with LWW (Last-Write-Wins) and deterministic
 * node-ID tiebreaking for concurrent conflicting writes.
 */
export class ReportCRDTResolver {
  public static resolve(local: Report, remote: Report): Report {
    // If IDs don't match, these are distinct records
    if (local.id !== remote.id) {
      throw new Error(`Cannot resolve reports with different IDs: ${local.id} vs ${remote.id}`);
    }

    const clockComparison = VectorClockEngine.compare(local.vectorClock, remote.vectorClock);

    // If local causally succeeds remote, keep local
    if (clockComparison === 'DOMINATES') {
      return local;
    }

    // If remote causally succeeds local, take remote
    if (clockComparison === 'DOMINATED_BY') {
      return remote;
    }

    // If clocks are equal and version matches, identical
    if (clockComparison === 'EQUAL') {
      return local.updatedAt >= remote.updatedAt ? local : remote;
    }

    // CONCURRENT CONFLICT: Neither dominates. Apply deterministic LWW resolution
    // Primary tie-breaker: updatedAt timestamp
    // Secondary tie-breaker: reporterId string comparison
    let winner: Report;
    if (local.updatedAt > remote.updatedAt) {
      winner = local;
    } else if (remote.updatedAt > local.updatedAt) {
      winner = remote;
    } else {
      winner = local.reporterId >= remote.reporterId ? local : remote;
    }

    // Merged vector clock must represent the union of both divergent histories
    const mergedClock = VectorClockEngine.merge(local.vectorClock, remote.vectorClock);

    // Merge high-safety data: take maximum casualties/trapped count observed across both branches
    const mergedCasualties = Math.max(local.casualtiesCount, remote.casualtiesCount);
    const mergedTrapped = Math.max(local.trappedCount, remote.trappedCount);

    // Merge resources needed (union of distinct items)
    const mergedResources = Array.from(
      new Set([...local.resourcesNeeded, ...remote.resourcesNeeded])
    );

    return {
      ...winner,
      casualtiesCount: mergedCasualties,
      trappedCount: mergedTrapped,
      resourcesNeeded: mergedResources,
      vectorClock: mergedClock,
      version: Math.max(local.version, remote.version) + 1,
    };
  }
}
