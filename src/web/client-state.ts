type VersionedSnapshot = {
    id: string;
    version: number;
    activeTurn: number;
    phase: 'answer' | 'reveal' | 'break' | 'finished';
};
const phaseOrder = {answer: 0, reveal: 1, break: 2, finished: 3};
/** Journal versions protect receipts; turn/phase also advance without journal writes. */
export function shouldApplySnapshot(current: VersionedSnapshot | null, next: VersionedSnapshot, requestGeneration: number, currentGeneration: number): boolean {
    if (requestGeneration !== currentGeneration) return false;
    if (!current || current.id !== next.id) return true;
    if (next.version < current.version) return false;
    if (current.phase === 'finished' && next.phase !== 'finished') return false;
    if (next.activeTurn < current.activeTurn) return false;
    if (next.activeTurn === current.activeTurn && phaseOrder[next.phase] < phaseOrder[current.phase]) return false;
    return true;
}
