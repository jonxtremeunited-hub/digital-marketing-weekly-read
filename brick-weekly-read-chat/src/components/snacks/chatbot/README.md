# Chatbot snack

Bare-bones chat against the Domo AI endpoint. A `useChat()` hook + a
composed `<Chatbot />` component you can drop into any pantry-scaffolded
app and have a working assistant in under a minute.

## What it does

- POSTs a conversation to `/domo/ai/v1/messages/chat` via `ryuu.js`
  (model defaults to `domo.domo_ai.domogpt-medium-v2.1`).
- Trims history to the last 5 turns before each request.
- Renders mirrored chat bubbles — user filled `bg-neutral-900` / white text,
  assistant outlined `bg-white` / `border-neutral-200` with `rounded-bl-sm`.
- Renders assistant replies as sanitized GFM markdown via `marked` +
  `DOMPurify` (lists, code, links, headings). User messages are plain text.
- Auto-scrolls, three-dot loading indicator, Enter to send / Shift+Enter
  for newline.

## Required peer deps

This snack imports `marked` and `dompurify`. After copying it in:

```bash
pnpm add marked dompurify
pnpm add -D @types/dompurify
```

It also expects a `.chatbot-md` selector for prose styling. Drop this in
`src/styles/globals.css` (or the equivalent) inside `@layer components`:

```css
.chatbot-md > *:first-child { margin-top: 0; }
.chatbot-md > *:last-child  { margin-bottom: 0; }
.chatbot-md p               { margin: 0 0 0.5rem; }
.chatbot-md ul, .chatbot-md ol { margin: 0 0 0.5rem; padding-left: 1.25rem; }
.chatbot-md ul              { list-style: disc; }
.chatbot-md ol              { list-style: decimal; }
.chatbot-md li              { margin: 0.125rem 0; }
.chatbot-md a               { color: hsl(var(--primary)); text-decoration: underline; text-underline-offset: 2px; }
.chatbot-md code            { background: hsl(var(--muted)); padding: 0.1rem 0.3rem; border-radius: 0.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.85em; }
.chatbot-md pre             { background: hsl(var(--muted)); padding: 0.625rem 0.75rem; border-radius: 0.375rem; overflow-x: auto; margin: 0 0 0.5rem; }
.chatbot-md pre code        { background: transparent; padding: 0; border-radius: 0; font-size: 0.85em; }
.chatbot-md h1, .chatbot-md h2, .chatbot-md h3 { font-weight: 600; margin: 0.5rem 0 0.25rem; }
.chatbot-md h1              { font-size: 1rem; }
.chatbot-md h2              { font-size: 0.95rem; }
.chatbot-md h3              { font-size: 0.9rem; }
.chatbot-md strong          { font-weight: 600; }
.chatbot-md blockquote      { border-left: 2px solid hsl(var(--border)); padding-left: 0.75rem; color: hsl(var(--muted-foreground)); margin: 0 0 0.5rem; }
```

## Usage

```tsx
import { Chatbot } from '@/components/snacks/chatbot';

<div className="h-[480px] rounded-lg border border-neutral-200">
  <Chatbot
    systemPrompt="You are a sales coach helping reps work this deal."
    greeting="Hey — ask me about the deal."
  />
</div>
```

Wrap the snack yourself — it owns no card border so it composes inside
any container. Give it a height; it's a flex column.

For full control, drop the wrapper and use the hook directly:

```tsx
import { useChat, MessageList, Composer } from '@/components/snacks/chatbot';

function MyChat() {
  const { messages, isLoading, send, reset } = useChat({ systemPrompt: '…' });
  return (
    <>
      <MessageList messages={messages} isLoading={isLoading} />
      <Composer onSend={(t) => void send(t)} disabled={isLoading} />
      <button onClick={reset}>Reset</button>
    </>
  );
}
```

## API

### `useChat(options?)`

| Option | Type | Default |
|---|---|---|
| `systemPrompt` | `string` | `"You are a helpful assistant inside a Domo app. Be concise."` |
| `model` | `string` | `"domo.domo_ai.domogpt-medium-v2.1"` |
| `greeting` | `string` | Pre-rendered hint pointing at the AI endpoint |

Returns `{ messages, isLoading, error, send, reset }`.

### `<Chatbot />`

Accepts every `useChat` option plus `className` and `placeholder`.

## What's deferred (bolt on later)

This snack is the floor, not the ceiling. The shape is designed so you
can add complexity without breaking the surface:

- **Tool use.** Replace `runOnce` in [`use-chat.ts`](use-chat.ts) with a
  `runLoop` that handles `TOOL_USE_REQUEST` blocks. See
  `internal/rev-radar/app/src/components/deal-chat/use-deal-chat.ts` for
  the canonical two-call shape.
- **Streaming.** Swap `Domo.post` for a fetch against the streaming
  variant of the endpoint and `setMessages` token-by-token.
- **Persistence / logging.** Wrap `send` in a side-effecting callback
  that writes to AppDB. Pattern at
  `internal/rev-radar/app/src/services/ai-chat-log.ts`.
- **Starter prompts / quick actions.** A row of pills rendered when
  `messages.length === 1` (only the greeting present).

## Why this shape

- One round-trip, no tool plumbing — the floor for "is the AI endpoint
  wired up?" should fit in 80 lines.
- The hook returns the same shape future tool-aware variants will. Code
  that consumes `useChat` here keeps working when you swap in the
  tool-loop version.
- The UI is pure pantry styling — monochrome bubbles, borders not
  shadows, `transition-colors` not `transition-all`. Copy and edit.

## Files

- [`types.ts`](types.ts) — `ChatMessage`, `UseChatOptions`, AI wire types
- [`use-chat.ts`](use-chat.ts) — the hook and the `runOnce` round-trip
- [`message-list.tsx`](message-list.tsx) — scroll container, bubbles, typing dots
- [`composer.tsx`](composer.tsx) — input + send button
- [`chatbot.tsx`](chatbot.tsx) — the composed default
- [`index.ts`](index.ts) — barrel re-export
