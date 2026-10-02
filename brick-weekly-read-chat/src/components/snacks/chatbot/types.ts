export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: number;
  role: ChatRole;
  content: string;
  createdAt: Date;
}

export interface UseChatOptions {
  systemPrompt?: string;
  model?: string;
  greeting?: string;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  send: (text: string) => Promise<void>;
  reset: () => void;
}

// Wire shape the Domo AI endpoint expects. Kept narrow on purpose — when the
// tool-use variant of this snack ships, `tools` and `toolChoice` become required
// and `content` widens to a union with TOOL_USE_REQUEST / TOOL_USE_RESULT blocks.
export interface DomoAIMessage {
  role: 'USER' | 'ASSISTANT';
  content: { type: 'TEXT'; text: string }[];
}

export interface DomoAIRequest {
  model: string;
  system: { type: 'TEXT'; text: string }[];
  input: DomoAIMessage[];
  tools?: unknown[];
  toolChoice?: { type: 'AUTO' | 'REQUIRED'; allowParallelToolCalls?: boolean };
}

export interface DomoAIResponse {
  content: ({ type: 'TEXT'; text: string } | { type: string; [key: string]: unknown })[];
}
