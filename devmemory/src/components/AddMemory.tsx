// DevMemory — neon form to add new project memory: Decision (+Reason), Bug, or Fix.

import React, { useState } from 'react';
import { ProjectMemory, GraphNode, NodeType } from '../types';
import { addNode, addEdge } from '../storage';
import { NEON } from '../theme';

interface Props {
  memory: ProjectMemory;
  onChange: (next: ProjectMemory) => void;
}

type Kind = 'Decision' | 'Bug' | 'Fix';

export const AddMemory: React.FC<Props> = ({ memory, onChange }) => {
  const [kind, setKind] = useState<Kind>('Decision');
  const [label, setLabel] = useState('');
  const [detail, setDetail] = useState('');
  const [reason, setReason] = useState('');
  const [targetId, setTargetId] = useState('');
  const [saved, setSaved] = useState(false);

  const components = memory.nodes.filter((n) => n.type === 'Component' || n.type === 'Dependency');
  const bugs = memory.nodes.filter((n) => n.type === 'Bug');

  const relatableNodes: GraphNode[] = kind === 'Fix' ? bugs : components;
  const relationVerb = kind === 'Decision' ? 'changed' : kind === 'Bug' ? 'occurs in' : 'resolves';

  const canSave = !!(label.trim() && detail.trim() && targetId && (kind !== 'Decision' || reason.trim()));

  const save = () => {
    if (!canSave) return;
    let m = memory;
    const prefix = kind === 'Decision' ? 'Decision' : kind === 'Bug' ? 'Bug' : 'Fix';
    const added = addNode(m, { type: kind as NodeType, label: `${prefix}: ${label.trim()}`, detail: detail.trim() });
    m = added.memory;
    const newId = added.id;

    if (kind === 'Decision') {
      m = addEdge(m, newId, targetId, 'CHANGED');
      const reasonNode = addNode(m, { type: 'Reason', label: `Reason: ${reason.trim().slice(0, 60)}`, detail: reason.trim() });
      m = reasonNode.memory;
      m = addEdge(m, newId, reasonNode.id, 'BECAUSE');
    } else if (kind === 'Bug') {
      m = addEdge(m, newId, targetId, 'OCCURS_IN');
    } else {
      m = addEdge(m, targetId, newId, 'RESOLVED_BY');
    }

    onChange(m);
    setLabel(''); setDetail(''); setReason(''); setTargetId('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['Decision', 'Bug', 'Fix'] as Kind[]).map((k) => (
          <button key={k} onClick={() => { setKind(k); setTargetId(''); }}
            style={{ ...tabStyle, ...(kind === k ? activeTab : {}) }}>
            {k}
          </button>
        ))}
      </div>

      <label style={lbl}>{kind} title</label>
      <input value={label} onChange={(e) => setLabel(e.target.value)} style={inp}
        placeholder={kind === 'Decision' ? 'e.g. Switch session store to Redis' : kind === 'Bug' ? 'e.g. #420 Login loop on Safari' : 'e.g. Pin Redis client to 4.6'} />

      <label style={lbl}>Details</label>
      <textarea value={detail} onChange={(e) => setDetail(e.target.value)} style={{ ...inp, minHeight: 60, resize: 'vertical' }}
        placeholder="What happened / what was decided and the specifics." />

      {kind === 'Decision' && (
        <>
          <label style={lbl}>Reason (why)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} style={inp}
            placeholder="e.g. In-memory sessions didn't survive restarts" />
        </>
      )}

      <label style={lbl}>
        {kind === 'Fix' ? 'Resolves which bug?' : kind === 'Bug' ? 'Occurs in which component/dependency?' : 'Changes which component/dependency?'}
      </label>
      <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={inp}>
        <option value="">Select…</option>
        {relatableNodes.map((n) => <option key={n.id} value={n.id} style={{ background: NEON.bgPanelSolid }}>{n.label}</option>)}
      </select>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <button onClick={save} disabled={!canSave} style={{ ...btn, opacity: canSave ? 1 : 0.45, cursor: canSave ? 'pointer' : 'not-allowed' }}>
          Store in project memory
        </button>
        {saved && <span style={{ color: NEON.green, fontSize: 13, textShadow: `0 0 8px ${NEON.green}` }}>✓ Saved — ask a question to see it reasoned over</span>}
      </div>

      <div style={{ fontSize: 11.5, color: NEON.textMuted, marginTop: 12, lineHeight: 1.5 }}>
        New memory links as <b style={{ color: NEON.textDim }}>{kind}</b> —[{relationVerb}]→ the node you pick, and persists server-side across sessions.
      </div>
    </div>
  );
};

const tabStyle: React.CSSProperties = {
  flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${NEON.border}`,
  background: 'rgba(255,255,255,0.02)', color: NEON.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const activeTab: React.CSSProperties = {
  background: `linear-gradient(135deg, ${NEON.cyan}22, ${NEON.magenta}22)`, color: NEON.cyan, borderColor: NEON.borderStrong, boxShadow: glowShadow(NEON.cyan),
};
function glowShadow(c: string) { return `0 0 8px ${c}66`; }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: NEON.textMuted, margin: '12px 0 5px' };
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 11px', borderRadius: 8, border: `1px solid ${NEON.border}`,
  background: 'rgba(0,0,0,0.3)', color: NEON.text, fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box',
};
const btn: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 10, border: `1px solid ${NEON.borderStrong}`,
  background: `linear-gradient(135deg, ${NEON.cyan}, ${NEON.magenta})`, color: '#05060f', fontWeight: 700, fontSize: 13, boxShadow: `0 0 12px ${NEON.cyan}66`,
};
