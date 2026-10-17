// DevMemory — the graph reasoning engine.
// Implements "blast-radius" debugging: anchor on a symptom, walk the graph
// outward, and collect every Decision / Bug / Fix / Dependency within range,
// ranked by connection strength (1 / distance).

import {
  ProjectMemory,
  GraphNode,
  GraphEdge,
  TraceResult,
  TracePathStep,
  EdgeRelation,
  RELATION_LABELS,
} from './types';

interface Adj {
  nodeId: string;
  relation: EdgeRelation;
  forward: boolean;
}

function buildAdjacency(memory: ProjectMemory): Record<string, Adj[]> {
  const adj: Record<string, Adj[]> = {};
  memory.nodes.forEach((n) => (adj[n.id] = []));
  memory.edges.forEach((e) => {
    if (!adj[e.from]) adj[e.from] = [];
    if (!adj[e.to]) adj[e.to] = [];
    adj[e.from].push({ nodeId: e.to, relation: e.relation, forward: true });
    adj[e.to].push({ nodeId: e.from, relation: e.relation, forward: false });
  });
  return adj;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'our', 'we', 'did', 'do',
  'does', 'why', 'how', 'what', 'could', 'that', 'this', 'change', 'changed',
  'related', 'current', 'it', 'any', 'can', 'you', 'module', 'under',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

// Score how well a node matches the query text.
function scoreNode(node: GraphNode, queryTokens: string[]): number {
  const haystack = tokenize(node.label + ' ' + node.detail);
  const hay = new Set(haystack);
  let score = 0;
  for (const qt of queryTokens) {
    if (hay.has(qt)) score += 2;
    else if (haystack.some((h) => h.includes(qt) || qt.includes(h))) score += 1;
  }
  // Prefer Bugs and Components as anchors — they're the "symptom" surface.
  if (node.type === 'Bug') score *= 1.5;
  if (node.type === 'Component') score *= 1.2;
  return score;
}

export interface AnchorMatch {
  node: GraphNode;
  score: number;
}

export function findAnchors(memory: ProjectMemory, query: string): AnchorMatch[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  return memory.nodes
    .map((node) => ({ node, score: scoreNode(node, tokens) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Bounded BFS from an anchor node. Returns implicated memory ranked by strength.
export function traceBlastRadius(
  memory: ProjectMemory,
  anchorId: string,
  maxHops = 3,
): TraceResult[] {
  const adj = buildAdjacency(memory);
  const nodeById: Record<string, GraphNode> = {};
  memory.nodes.forEach((n) => (nodeById[n.id] = n));

  const seen: Record<string, { dist: number; path: TracePathStep[] }> = {
    [anchorId]: {
      dist: 0,
      path: [{ nodeId: anchorId, relation: 'start', label: nodeById[anchorId]?.label ?? anchorId }],
    },
  };
  const queue: string[] = [anchorId];

  while (queue.length) {
    const cur = queue.shift()!;
    const curInfo = seen[cur];
    if (curInfo.dist >= maxHops) continue;
    for (const nb of adj[cur] ?? []) {
      if (!(nb.nodeId in seen)) {
        const nbNode = nodeById[nb.nodeId];
        seen[nb.nodeId] = {
          dist: curInfo.dist + 1,
          path: [
            ...curInfo.path,
            { nodeId: nb.nodeId, relation: nb.relation, label: nbNode?.label ?? nb.nodeId },
          ],
        };
        queue.push(nb.nodeId);
      }
    }
  }

  const results: TraceResult[] = [];
  for (const [id, info] of Object.entries(seen)) {
    if (id === anchorId) continue;
    const node = nodeById[id];
    if (!node) continue;
    if (['Decision', 'Fix', 'Bug', 'Dependency'].includes(node.type)) {
      results.push({
        node,
        distance: info.dist,
        strength: +(1 / info.dist).toFixed(2),
        path: info.path,
      });
    }
  }
  return results.sort((a, b) => b.strength - a.strength || a.distance - b.distance);
}

// Build a human-readable causal path string for display.
export function pathToString(path: TracePathStep[]): string {
  return path
    .map((step, i) => {
      const short = step.label.replace(/^[^:]+:\s*/, '');
      if (i === 0) return short;
      return `—[${RELATION_LABELS[step.relation as EdgeRelation] ?? step.relation}]→ ${short}`;
    })
    .join(' ');
}

// Collect the subgraph node IDs touched by a trace (for highlighting).
export function tracedNodeIds(anchorId: string, results: TraceResult[], topN = 8): Set<string> {
  const ids = new Set<string>([anchorId]);
  results.slice(0, topN).forEach((r) => r.path.forEach((p) => ids.add(p.nodeId)));
  return ids;
}
