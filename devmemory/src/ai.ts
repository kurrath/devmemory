// DevMemory — AI layer. Takes the structured graph trace and asks the model to
// write a grounded debugging answer. The reasoning (what's connected and how
// strongly) is done by the graph engine; the model only narrates the evidence.

import { aiClient, AIInferenceError } from './runtime-shim';
import { GraphNode, TraceResult } from './types';
import { pathToString } from './engine';

const MODEL = 'anthropic.claude-sonnet-4-6';

export interface AnswerInput {
  question: string;
  anchor: GraphNode;
  results: TraceResult[];
}

function buildEvidence(input: AnswerInput): string {
  const lines: string[] = [];
  lines.push(`SYMPTOM / ANCHOR: ${input.anchor.label} — ${input.anchor.detail}`);
  lines.push('');
  lines.push('IMPLICATED PROJECT MEMORY (ranked by connection strength, 1.0 = directly connected):');
  input.results.slice(0, 8).forEach((r, i) => {
    lines.push(
      `${i + 1}. [${r.node.type}] ${r.node.label} — ${r.node.detail}` +
        `\n   strength=${r.strength.toFixed(2)} (${r.distance} hop${r.distance > 1 ? 's' : ''})` +
        `\n   causal path: ${pathToString(r.path)}`,
    );
  });
  return lines.join('\n');
}

export async function synthesizeAnswer(input: AnswerInput): Promise<string> {
  const evidence = buildEvidence(input);
  const system =
    'You are DevMemory, a developer assistant with memory of a project\'s technical ' +
    'decisions, dependencies, past bugs, and fixes. You answer debugging questions ' +
    'STRICTLY from the provided graph evidence. Rules:\n' +
    '- Open with a one-line verdict: is the suspected change likely related to the symptom? (Yes / Possibly / No, and why).\n' +
    '- Then explain the causal chain in plain English, naming the specific Decision, its Reason, the past Bug, and the Fix.\n' +
    '- If a prior Fix exists for a connected bug, explicitly recommend checking or re-applying it.\n' +
    '- Be concise (max ~160 words). Do not invent facts beyond the evidence. Use the exact decision/bug/fix names.';

  const text =
    `Developer's question: "${input.question}"\n\n${evidence}\n\n` +
    'Write the debugging answer now.';

  try {
    const resp = await aiClient.prompt(MODEL, text, system);
    return resp?.trim() || 'No answer was generated. Please try rephrasing the question.';
  } catch (e) {
    if (e instanceof AIInferenceError) {
      return `AI inference error: ${e.message}`;
    }
    throw e;
  }
}
