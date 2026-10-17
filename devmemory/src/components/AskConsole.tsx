// DevMemory — neon debugging console: ask a question, see verdict + ranked evidence.

import React, { useState } from 'react';
import { ProjectMemory, TraceResult, GraphNode } from '../types';
import { findAnchors, traceBlastRadius, tracedNodeIds, pathToString } from '../engine';
import { synthesizeAnswer } from '../ai';
import { NEON, NEON_NODE, glow } from '../theme';

interface Props {
  memory: ProjectMemory;
  onHighlight: (ids: Set<string>) => void;
}

const SAMPLES = [
  'Why did we change the authentication module, and could it be related to the current API 401 error?',
  'Checkout is timing out under load — what past decisions touch this?',
  'Users report stale data on the dashboard. Any related fixes?',
];

export const AskConsole: React.FC<Props> = ({ memory, onHighlight }) => {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<GraphNode | null>(null);
  const [results, setResults] = useState<TraceResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = async (question: string) => {
    const text = question.trim();
    if (!text) return;
    setLoading(true); setError(null); setAnswer(null); setResults([]); setAnchor(null);
    try {
      const anchors = findAnchors(memory, text);
      if (!anchors.length) {
        setError('No matching symptom found in project memory. Try mentioning auth/401, checkout timeout, or stale dashboard data — or add the decision/bug first.');
        onHighlight(new Set());
        setLoading(false);
        return;
      }
      const top = anchors[0].node;
      setAnchor(top);
      const traced = traceBlastRadius(memory, top.id, 3);
      setResults(traced);
      onHighlight(tracedNodeIds(top.id, traced, 8));
      const ans = await synthesizeAnswer({ question: text, anchor: top, results: traced });
      setAnswer(ans);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong while reasoning over the graph.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') run(q); }}
          placeholder="Ask a debugging question…"
          style={inputStyle}
        />
        <button onClick={() => run(q)} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Reasoning…' : 'Reason'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {SAMPLES.map((s, i) => (
          <button key={i} onClick={() => { setQ(s); run(s); }} style={chipStyle}>
            {s.length > 46 ? s.slice(0, 44) + '…' : s}
          </button>
        ))}
      </div>

      {error && <div style={{ ...callout, borderColor: `${NEON.red}66`, background: `${NEON.red}14`, color: NEON.text }}>{error}</div>}

      {anchor && (
        <div style={{ fontSize: 12, color: NEON.textMuted, marginBottom: 10 }}>
          Anchored on <b style={{ color: NEON_NODE[anchor.type].css }}>{anchor.label}</b> · {results.length} connected node{results.length !== 1 ? 's' : ''}
        </div>
      )}

      {loading && !answer && (
        <div style={{ ...callout, color: NEON.cyan }}>▸ Tracing the graph outward from the symptom and narrating the evidence…</div>
      )}

      {answer && (
        <div style={{ ...callout, background: `${NEON.cyan}10`, borderColor: `${NEON.cyan}55`, whiteSpace: 'pre-wrap', lineHeight: 1.6, boxShadow: `inset 0 0 20px ${NEON.cyan}0a` }}>
          {answer}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: NEON.magenta, marginBottom: 8, textShadow: glow(NEON.magenta, 4) }}>
            Implicated memory · ranked by connection strength
          </div>
          {results.slice(0, 6).map((r) => {
            const c = NEON_NODE[r.node.type]?.css ?? NEON.cyan;
            return (
              <div key={r.node.id} style={{ borderLeft: `3px solid ${c}`, boxShadow: `-6px 0 14px -8px ${c}`, padding: '8px 0 8px 12px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 6, background: `${c}1f`, color: c, border: `1px solid ${c}55` }}>{r.node.type}</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: NEON.text }}>{r.node.label.replace(/^[^:]+:\s*/, '')}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: NEON.textMuted }}>{r.strength.toFixed(2)} · {r.distance}h</span>
                </div>
                <div style={{ color: NEON.textDim, fontSize: 12.5, marginTop: 2 }}>{r.node.detail}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: NEON.textMuted, marginTop: 4 }}>{pathToString(r.path)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '11px 13px', borderRadius: 10, border: `1px solid ${NEON.border}`,
  background: 'rgba(0,0,0,0.3)', color: NEON.text, fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none',
};
const btnStyle: React.CSSProperties = {
  padding: '11px 18px', borderRadius: 10, border: `1px solid ${NEON.borderStrong}`,
  background: `linear-gradient(135deg, ${NEON.cyan}, ${NEON.blue})`, color: '#05060f',
  fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: glow(NEON.cyan, 8),
};
const chipStyle: React.CSSProperties = {
  fontSize: 11.5, padding: '5px 10px', borderRadius: 100, background: `${NEON.purple}18`,
  color: NEON.purple, border: `1px solid ${NEON.purple}55`, cursor: 'pointer',
};
const callout: React.CSSProperties = {
  border: `1px solid ${NEON.border}`, borderRadius: 10, padding: '12px 14px', fontSize: 13.5, color: NEON.text,
  background: 'rgba(0,0,0,0.2)',
};
