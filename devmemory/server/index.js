import express from 'express';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.API_PORT ?? 3001);
const host = process.env.HOST ?? '127.0.0.1';
const defaultDataFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/memory.json');
const dataFile = path.resolve(process.env.DEVMEMORY_DATA_FILE ?? defaultDataFile);
const memoryKey = 'devmemory::project:helios';
let memoryValue = null;
let writeQueue = Promise.resolve();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

async function loadMemory() {
  try {
    const saved = JSON.parse(await readFile(dataFile, 'utf8'));
    if (typeof saved.value === 'string') memoryValue = saved.value;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function validateMemory(value) {
  if (typeof value !== 'string') return false;
  try {
    const memory = JSON.parse(value);
    return Array.isArray(memory.nodes) && Array.isArray(memory.edges);
  } catch {
    return false;
  }
}

function persistMemory(value) {
  memoryValue = value;
  writeQueue = writeQueue.then(async () => {
    await mkdir(path.dirname(dataFile), { recursive: true });
    const temporaryFile = `${dataFile}.tmp`;
    await writeFile(temporaryFile, JSON.stringify({ value }), 'utf8');
    await rename(temporaryFile, dataFile);
  });
  return writeQueue;
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));

app.get('/api/memory', (request, response) => {
  if (request.query.tableName !== 'devmemory' || request.query.key !== 'project:helios') {
    return response.status(400).json({ error: 'Unknown project memory key.' });
  }
  response.json({ item: memoryValue === null ? null : { value: memoryValue } });
});

app.put('/api/memory', async (request, response, next) => {
  const { tableName, key, value } = request.body ?? {};
  if (tableName !== 'devmemory' || key !== 'project:helios') {
    return response.status(400).json({ error: 'Unknown project memory key.' });
  }
  if (!validateMemory(value)) {
    return response.status(400).json({ error: 'Memory must contain valid nodes and edges arrays.' });
  }
  try {
    await persistMemory(value);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

function heuristicAnswer(promptText) {
  const anchorMatch = promptText.match(/SYMPTOM \/ ANCHOR:\s*(.+)/);
  const anchor = anchorMatch ? anchorMatch[1].split(' — ')[0].trim() : 'the reported symptom';
  const lines = promptText.split('\n');
  const name = (line) => line?.match(/\]\s*(.+?)\s*—/)?.[1]?.trim();
  const decision = name(lines.find((line) => /\[Decision\]/.test(line)));
  const bug = name(lines.find((line) => /\[Bug\]/.test(line)));
  const fix = name(lines.find((line) => /\[Fix\]/.test(line)));
  let answer = decision
    ? `Likely yes — connected. The symptom at ${anchor} traces back to the decision "${decision}".`
    : `Based on project memory, ${anchor} is connected to the items below.`;
  if (bug) answer += ` It previously surfaced as ${bug}.`;
  if (fix) answer += ` A prior fix exists: "${fix}" — check whether it is still in place or needs re-applying.`;
  return `${answer}\n\nSee the ranked evidence below for the full causal chain and connection strengths.`;
}

app.post('/api/ai/prompt', async (request, response) => {
  const { text, system } = request.body ?? {};
  if (typeof text !== 'string' || !text.trim() || text.length > 20000 || (system != null && typeof system !== 'string')) {
    return response.status(400).json({ error: 'Provide a prompt with at most 20,000 characters.' });
  }

  if (!process.env.OPENAI_API_KEY) return response.json({ text: heuristicAnswer(text) });

  try {
    const upstream = await fetch(`${(process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: text },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });
    const result = await upstream.json();
    if (!upstream.ok) {
      return response.status(502).json({ error: result.error?.message ?? 'The AI provider request failed.' });
    }
    const answer = result.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
      return response.status(502).json({ error: 'The AI provider returned an empty answer.' });
    }
    response.json({ text: answer.trim() });
  } catch {
    response.status(502).json({ error: 'Could not reach the configured AI provider.' });
  }
});

app.use((error, _request, response, _next) => {
  console.error('API request failed:', error);
  response.status(500).json({ error: 'Internal server error.' });
});

await loadMemory();
app.listen(port, host, () => console.log(`DevMemory API listening on http://${host}:${port}`));