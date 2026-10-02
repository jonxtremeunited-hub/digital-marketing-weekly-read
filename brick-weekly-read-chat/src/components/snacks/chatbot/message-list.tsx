import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useEffect, useMemo, useRef } from 'react';

import { cn } from '@/lib/utils';

import type { ChatMessage } from './types';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  className?: string;
}

export function MessageList({ messages, isLoading, className }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Only auto-scroll if the user was already near the bottom; otherwise
    // they're reading an older message and yanking them down feels hostile.
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div
      ref={scrollRef}
      className={cn('flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4', className)}
    >
      {messages.map((m) => (
        <Bubble key={m.id} message={m} />
      ))}
      {isLoading && <TypingIndicator />}
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="max-w-[75%] self-end rounded-2xl rounded-br-sm bg-neutral-900 px-4 py-2.5 text-sm text-white">
        {message.content}
      </div>
    );
  }
  return <MarkdownBubble content={message.content} />;
}

function MarkdownBubble({ content }: { content: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(content, { async: false, breaks: true, gfm: true });
    return DOMPurify.sanitize(raw);
  }, [content]);

  return (
    <div
      className="chatbot-md max-w-[85%] self-start rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-4 py-2.5 text-sm leading-relaxed text-neutral-900"
      // Sanitized via DOMPurify above.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const TYPING_DOT_DELAYS = [
  'h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:0ms]',
  'h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:150ms]',
  'h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:300ms]',
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 self-start py-1">
      {TYPING_DOT_DELAYS.map((cls, i) => (
        <span key={i} className={cls} />
      ))}
    </div>
  );
}
