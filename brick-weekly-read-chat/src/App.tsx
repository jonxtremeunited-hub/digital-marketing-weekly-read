import DOMPurify from 'dompurify';
import { ChevronDown, Loader2, Send, Sparkles } from 'lucide-react';
import { marked } from 'marked';
import { useRef, useState } from 'react';

import { askWeeklyRead } from './lib/agent';
import { buildMetricsBundle, lastFullWeek } from './lib/metrics';
import { cn } from './lib/utils';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
}

const STARTERS = [
  'Why were MQLs up the week of 9/20?',
  'Is the lead surge volume or quality?',
  'What should we investigate this week?',
];

function renderMarkdown(md: string): string {
  return DOMPurify.sanitize(marked.parse(md, { async: false }));
}

export function App() {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<string | null>(null);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || loading) return;
    setExpanded(true);
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setLoading(true);
    try {
      metricsRef.current ??= await buildMetricsBundle(lastFullWeek());
      const answer = await askWeeklyRead(question, metricsRef.current);
      setMessages((m) => [...m, { role: 'assistant', text: answer }]);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Something went wrong.';
      setMessages((m) => [...m, { role: 'assistant', text: `⚠️ ${detail}` }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => threadRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }));
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#eef4fb] font-sans text-[#161c21] antialiased">
      {/* header — only when expanded */}
      {expanded && (
        <div className="flex items-center justify-between border-b border-[#d6e2f0] px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-[#2d4a73]">
            <Sparkles className="h-3.5 w-3.5" />
            Weekly Read Analyst
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-[#5c6771] hover:bg-white/60"
            aria-label="Collapse"
          >
            Collapse <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* thread — only when expanded */}
      {expanded && (
        <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'user' ? (
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#2d4a73] px-3 py-1.5 text-sm text-white">
                  {m.text}
                </div>
              ) : (
                <div
                  className="prose prose-sm max-w-[92%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-sm leading-relaxed text-[#161c21] shadow-sm [&_h1]:mb-1 [&_h1]:mt-0 [&_h1]:text-base [&_h2]:mb-1 [&_h2]:mt-2 [&_h2]:text-sm [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-sm [&_li]:my-0.5 [&_p]:my-1 [&_strong]:font-semibold [&_ul]:my-1 [&_ul]:pl-4"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }}
                />
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#5c6771]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing the data…
            </div>
          )}
        </div>
      )}

      {/* starters — only when expanded + empty */}
      {expanded && messages.length === 0 && !loading && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => void ask(s)}
              className="rounded-full border border-[#cdd4da] bg-white px-2.5 py-1 text-xs text-[#2d4a73] hover:border-[#2d4a73]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* input bar — always visible */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className={cn('flex items-center gap-2 px-3', expanded ? 'py-2' : 'h-full py-2')}
      >
        {!expanded && <Sparkles className="h-4 w-4 shrink-0 text-[#2d4a73]" />}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => messages.length > 0 && setExpanded(true)}
          placeholder="Ask me about this data"
          className="min-w-0 flex-1 rounded-lg border border-[#cdd4da] bg-white px-3 py-1.5 text-sm text-[#161c21] placeholder:text-[#8a949c] focus:border-[#2d4a73] focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex shrink-0 items-center justify-center rounded-lg bg-[#2d4a73] px-3 py-1.5 text-white disabled:opacity-40"
          aria-label="Ask"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
