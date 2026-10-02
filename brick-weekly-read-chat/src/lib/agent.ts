// Answers a question using Domo's in-platform text generation (Anthropic-backed
// DomoGPT), grounded in the LIVE weekly metrics bundle + the reasoning rules
// below. We call text-generation (not the AI-Library agent) because agent
// execution only runs inside Domo's native AI Chat UI, not via API — but
// text-generation does answer via API, and we feed it real numbers.
import { apiProxy } from './api-proxy';
import { deepFind, preview, toValue } from './ce';

const MODEL = 'domo.domo_ai.domogpt-medium-v2.2:anthropic';

const SYSTEM = [
  'You are the Digital Marketing Weekly Read analyst for Domo, covering NAM digital marketing.',
  'Answer the user strictly from the LIVE METRICS provided — never invent numbers; if the metrics do not cover it, say so briefly.',
  'Definitions: NAM = Corporate/Enterprise/Partner; digital channels only; MQL counted by created week; SAL = New-Logo.',
  'How to reason: recurse the "why" (channel → spend/traffic → CTA/landing); distinguish efficiency vs volume vs demand',
  '(cost/MQL down on flat spend = a durable efficiency win; leads up on flat traffic = a conversion/CTA story, not new demand);',
  'judge lead quality via the CTA→SAL mix using the reference rates given in the metrics (Talk to Sales ~37% converts far better than Custom Video Demo Request ~8%).',
  'Be concise and specific, cite the actual numbers, and prefer short markdown sections or bullets over long paragraphs.',
].join(' ');

export async function askWeeklyRead(question: string, metrics: string): Promise<string> {
  const input = `${SYSTEM}\n\nLIVE METRICS:\n${metrics}\n\nQUESTION: ${question}`;
  const raw = await apiProxy<unknown>({
    method: 'POST',
    path: '/api/ai/v1/text/generation',
    body: { input, model: MODEL },
    contentType: 'application/json',
  });
  const out = deepFind(toValue(raw), 'output');
  if (out) return out.trim();
  throw new Error(`No answer returned. Raw: ${preview(raw)}`);
}
