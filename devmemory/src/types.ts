// DevMemory — core domain types for the project-memory knowledge graph.

export type NodeType =
  | 'Project'
  | 'Component'
  | 'Dependency'
  | 'Decision'
  | 'Reason'
  | 'Bug'
  | 'Fix';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  detail: string;
  createdAt: string; // ISO
}

export type EdgeRelation =
  | 'HAS_COMPONENT'
  | 'DEPENDS_ON'
  | 'CALLS'
  | 'CHANGED'
  | 'BECAUSE'
  | 'INTRODUCED'
  | 'CONTRIBUTED_TO'
  | 'OCCURS_IN'
  | 'TRIGGERED_BY'
  | 'RESOLVED_BY'
  | 'CONFIGURED';

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relation: EdgeRelation;
}

export interface ProjectMemory {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// A single step along a reasoning path.
export interface TracePathStep {
  nodeId: string;
  relation: EdgeRelation | 'start';
  label: string;
}

// A node implicated by the blast-radius reasoning, with its path + score.
export interface TraceResult {
  node: GraphNode;
  distance: number;
  strength: number; // 1 / distance
  path: TracePathStep[];
}

export const NODE_COLORS: Record<NodeType, string> = {
  Project: '#3b82f6',
  Component: '#3b82f6',
  Dependency: '#f59e0b',
  Decision: '#9333ea',
  Reason: '#a855f7',
  Bug: '#ef4444',
  Fix: '#22c55e',
};

export const RELATION_LABELS: Record<EdgeRelation, string> = {
  HAS_COMPONENT: 'has component',
  DEPENDS_ON: 'depends on',
  CALLS: 'calls',
  CHANGED: 'changed',
  BECAUSE: 'because',
  INTRODUCED: 'introduced',
  CONTRIBUTED_TO: 'contributed to',
  OCCURS_IN: 'occurs in',
  TRIGGERED_BY: 'triggered by',
  RESOLVED_BY: 'resolved by',
  CONFIGURED: 'configured',
};
