// DevMemory — neon shell. Dark cyberpunk UI with glow, animated grid backdrop,
// and the 3D graph.

import React, { useEffect, useState } from 'react';
import { ProjectMemory, GraphNode, NodeType } from './types';
import { loadMemory, saveMemory, resetMemory } from './storage';
import { Graph3D } from './components/Graph3D';
import { AskConsole } from './components/AskConsole';
import { AddMemory } from './components/AddMemory';
import { NEON, NEON_NODE, glow } from './theme';

type Tab = 'ask' | 'add';

const LEGEND: { type: NodeType; label: string }[] = [
  { type: 'Component', label: 'Component' },
  { type: 'Dependency', label: 'Dependency' },
  { type: 'Decision', label: 'Decision' },
  { type: 'Reason', label: 'Reason' },
  { type: 'Bug', label: 'Bug' },
  { type: 'Fix', label: 'Fix' },
];

export const App = () => {
  const [memory, setMemory] = useState<ProjectMemory | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [tab, setTab] = useState<Tab>('ask');

  useEffect(() => {
    loadMemory().then(setMemory).catch((e) => setLoadError(e?.message ?? 'Failed to load project memory.'));
  }, []);

  const persist = async (next: ProjectMemory) => {
    setMemory(next);
    try { await saveMemory(next); } catch (e: any) { setLoadError(e?.message ?? 'Failed to save.'); }
  };

  const doReset = async () => {
    const fresh = await resetMemory();
    setMemory(fresh);
    setHighlight(new Set());
    setSelected(null);
  };

  if (loadError) return <div style={{ ...wrap, color: NEON.red }}>Error: {loadError}</div>;
  if (!memory) return <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: NEON.cyan, textShadow: glow(NEON.cyan) }}>Initializing project memory…</span></div>;

  const counts = {
    decisions: memory.nodes.filter((n) => n.type === 'Decision').length,
    bugs: memory.nodes.filter((n) => n.type === 'Bug').length,
    fixes: memory.nodes.filter((n) => n.type === 'Fix').length,
  };

  return (
    <div style={wrap}>
      <div style={gridBackdrop} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
          <div style={logo}>DM</div>
          <div>
            <h1 style={title}>DevMemory</h1>
            <div style={{ color: NEON.textDim, fontSize: 13 }}>
              Project-memory assistant · remembers decisions, dependencies, bugs &amp; fixes — and reasons across them in 3D.
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <Stat n={counts.decisions} label="decisions" color={NEON.purple} />
            <Stat n={counts.bugs} label="bugs" color={NEON.red} />
            <Stat n={counts.fixes} label="fixes" color={NEON.green} />
          </div>
        </div>

        <div style={layout}>
          <div style={panel}>
            <div style={panelHdr}>◢ Neural Graph · drag to orbit · scroll to zoom · click a node</div>
            <Graph3D memory={memory} highlight={highlight} onSelect={setSelected} height={440} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginTop: 12, fontSize: 11.5 }}>
              {LEGEND.map((l) => (
                <span key={l.type} style={{ display: 'flex', alignItems: 'center', gap: 6, color: NEON.textDim }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: NEON_NODE[l.type].css, boxShadow: glow(NEON_NODE[l.type].css, 6) }} /> {l.label}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 12.5, color: NEON.textDim, minHeight: 34, borderTop: `1px solid ${NEON.border}`, paddingTop: 10 }}>
              {selected
                ? <><b style={{ color: NEON_NODE[selected.type].css, textShadow: glow(NEON_NODE[selected.type].css, 6) }}>{selected.label}</b><br />{selected.detail}</>
                : 'Click a glowing node to inspect its stored memory.'}
            </div>
          </div>

          <div style={panel}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <button onClick={() => setTab('ask')} style={{ ...segBtn, ...(tab === 'ask' ? segActive : {}) }}>⚡ Ask / Debug</button>
              <button onClick={() => setTab('add')} style={{ ...segBtn, ...(tab === 'add' ? segActive : {}) }}>+ Add Memory</button>
              <button onClick={doReset} title="Reset to seed demo" style={{ ...segBtn, flex: 'none', padding: '8px 12px', color: NEON.textMuted }}>↺</button>
            </div>
            {tab === 'ask'
              ? <AskConsole memory={memory} onHighlight={setHighlight} />
              : <AddMemory memory={memory} onChange={persist} />}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: NEON.textMuted, marginTop: 18, letterSpacing: '0.03em' }}>
          Project → Component → Dependency → Bug → Fix · Decision → Reason &nbsp;|&nbsp; blast-radius graph trace + AI narration · persisted server-side
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ n: number; label: string; color: string }> = ({ n, label, color }) => (
  <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}44` }}>
    <div style={{ fontSize: 18, fontWeight: 700, color, textShadow: glow(color, 6), fontFamily: 'var(--font-mono)' }}>{n}</div>
    <div style={{ fontSize: 10, color: NEON.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
  </div>
);

const wrap: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', background: NEON.bg, color: NEON.text,
  minHeight: '100vh', padding: 20, boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
};
const gridBackdrop: React.CSSProperties = {
  position: 'absolute', inset: 0,
  backgroundImage: 'linear-gradient(rgba(0,240,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.05) 1px, transparent 1px)',
  backgroundSize: '40px 40px',
  maskImage: 'radial-gradient(circle at 50% 30%, black 0%, transparent 80%)',
  WebkitMaskImage: 'radial-gradient(circle at 50% 30%, black 0%, transparent 80%)',
  pointerEvents: 'none', zIndex: 0,
};
const title: React.CSSProperties = {
  fontSize: 24, margin: 0, fontWeight: 700, letterSpacing: '0.02em',
  color: NEON.cyan, textShadow: glow(NEON.cyan, 10),
};
const logo: React.CSSProperties = {
  width: 42, height: 42, borderRadius: 12,
  background: `linear-gradient(135deg, ${NEON.cyan}, ${NEON.magenta})`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#05060f', fontWeight: 800, fontSize: 18, boxShadow: glow(NEON.cyan, 14),
};
const layout: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)', gap: 16, marginTop: 18,
};
const panel: React.CSSProperties = {
  background: NEON.bgPanel, border: `1px solid ${NEON.border}`, borderRadius: 16, padding: 16,
  backdropFilter: 'blur(10px)', boxShadow: '0 0 30px rgba(0,240,255,0.08), inset 0 0 20px rgba(0,240,255,0.03)',
};
const panelHdr: React.CSSProperties = {
  fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: NEON.cyan, fontWeight: 700, marginBottom: 12, textShadow: glow(NEON.cyan, 4),
};
const segBtn: React.CSSProperties = {
  flex: 1, padding: '9px 0', borderRadius: 10, border: `1px solid ${NEON.border}`, background: 'rgba(255,255,255,0.02)',
  color: NEON.textDim, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
};
const segActive: React.CSSProperties = {
  background: `linear-gradient(135deg, ${NEON.cyan}22, ${NEON.magenta}22)`,
  color: NEON.cyan, borderColor: NEON.borderStrong, boxShadow: glow(NEON.cyan, 6),
};

export default App;
