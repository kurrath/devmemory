// DevMemory — persistence layer over Page Storage (shared scope).
// The whole project memory is stored as a single JSON blob keyed by project.
// On first run we seed it with the demo scenario.

import { getSharedItem, putSharedItem, PageStorageError } from './runtime-shim';
import { ProjectMemory, GraphNode, GraphEdge } from './types';
import { SEED_MEMORY } from './seed';

const TABLE = 'devmemory';
const KEY = 'project:helios';

export async function loadMemory(): Promise<ProjectMemory> {
  try {
    const result = await getSharedItem({ tableName: TABLE, key: KEY });
    if (result && result.item && result.item.value) {
      const parsed = JSON.parse(result.item.value) as ProjectMemory;
      if (parsed.nodes && parsed.edges && parsed.nodes.length) return parsed;
    }
  } catch (e) {
    if (!(e instanceof PageStorageError)) throw e;
    // fall through to seed
  }
  // First run (or empty): seed it.
  await saveMemory(SEED_MEMORY);
  return SEED_MEMORY;
}

export async function saveMemory(memory: ProjectMemory): Promise<void> {
  await putSharedItem({
    tableName: TABLE,
    key: KEY,
    value: JSON.stringify(memory),
  });
}

export async function resetMemory(): Promise<ProjectMemory> {
  await saveMemory(SEED_MEMORY);
  return JSON.parse(JSON.stringify(SEED_MEMORY));
}

// --- Mutators (return a new memory object; caller persists) ---

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export function addNode(
  memory: ProjectMemory,
  node: Omit<GraphNode, 'id' | 'createdAt'> & { id?: string },
): { memory: ProjectMemory; id: string } {
  const id = node.id ?? uid(node.type.toLowerCase().slice(0, 3));
  const newNode: GraphNode = {
    id,
    type: node.type,
    label: node.label,
    detail: node.detail,
    createdAt: new Date().toISOString(),
  };
  return {
    memory: { ...memory, nodes: [...memory.nodes, newNode] },
    id,
  };
}

export function addEdge(
  memory: ProjectMemory,
  from: string,
  to: string,
  relation: GraphEdge['relation'],
): ProjectMemory {
  const edge: GraphEdge = { id: uid('e'), from, to, relation };
  return { ...memory, edges: [...memory.edges, edge] };
}
