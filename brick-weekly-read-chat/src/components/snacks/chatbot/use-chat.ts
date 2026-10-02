import { useCallback, useRef, useState } from 'react';
import Domo from 'ryuu.js';

import type {
  ChatMessage,
  DomoAIMessage,
  DomoAIRequest,
  DomoAIResponse,
  UseChatOptions,
  UseChatReturn,
} from './types';

const DEFAULT_MODEL = 'domo.domo_ai.domogpt-medium-v2.1';
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant inside a Domo app. Be concise.';
const DEFAULT_GREETING = "Hi, I'm your friendly AI assistant. Ask me anything";

// History window sent to the model on each turn. Five turns matches what
// rev-radar and gocanvas-wizard-chat both settled on — enough for context,
// short enough to keep payload predictable. Bump when you wire tool use.
const MAX_HISTORY = 5;

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const model = options.model ?? DEFAULT_MODEL;
  const greeting = options.greeting ?? DEFAULT_GREETING;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 0, role: 'assistant', content: greeting, createdAt: new Date() },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Ref mirrors so `send` stays a stable callback across turns. Without these,
  // each new message would recreate `send` and cascade re-renders into the
  // composer — matters more when streaming / tool-use lands.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  const reset = useCallback(() => {
    setMessages([{ id: 0, role: 'assistant', content: greeting, createdAt: new Date() }]);
    setError(null);
  }, [greeting]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoadingRef.current) return;

      const userMessage: ChatMessage = {
        id: Date.now(),
        role: 'user',
        content: trimmed,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const assistantText = await runOnce({
          model,
          systemPrompt,
          history: [...messagesRef.current, userMessage].slice(-MAX_HISTORY),
        });

        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: 'assistant', content: assistantText, createdAt: new Date() },
        ]);
      } catch (err) {
        const e = err instanceof Error ? err : new Error('Chat request failed');
        setError(e);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'assistant',
            content: `Something went wrong: ${e.message}`,
            createdAt: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [model, systemPrompt],
  );

  return { messages, isLoading, error, send, reset };
}

// One round-trip to the Domo AI endpoint. Returns the assistant's text reply.
//
// We hit `/messages/chat` — the plain chat-completion endpoint. The payload
// shape is identical to `/messages/tools`, but `/chat` skips the tool-use
// machinery we don't exercise here.
//
// When you bolt on tool use, replace this with a `runLoop` that:
//   1. Switches the URL back to `/domo/ai/v1/messages/tools`
//   2. Adds `tools` + `toolChoice: { type: 'AUTO' }` to the payload
//   3. Detects `TOOL_USE_REQUEST` blocks in the response
//   4. Executes each tool via a registry, appends an ASSISTANT message
//      carrying the tool requests and a USER message carrying TOOL_USE_RESULT
//      blocks, then POSTs again until the model returns plain TEXT.
// See internal/rev-radar/app/src/components/deal-chat/use-deal-chat.ts for the
// canonical two-call shape we're deliberately not pulling in here.
async function runOnce(args: {
  model: string;
  systemPrompt: string;
  history: ChatMessage[];
}): Promise<string> {
  const input: DomoAIMessage[] = args.history.map((m) => ({
    role: m.role === 'user' ? 'USER' : 'ASSISTANT',
    content: [{ type: 'TEXT', text: m.content }],
  }));

  const payload: DomoAIRequest = {
    model: args.model,
    system: [{ type: 'TEXT', text: args.systemPrompt }],
    input,
  };

  const response = await Domo.post<DomoAIResponse>('/domo/ai/v1/messages/chat', payload);
  const textBlock = response.content.find((c): c is { type: 'TEXT'; text: string } => c.type === 'TEXT');
  return textBlock?.text ?? "I didn't get a usable response. Try again.";
}
