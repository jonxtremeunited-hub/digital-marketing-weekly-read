import { cn } from '@/lib/utils';

import { Composer } from './composer';
import { MessageList } from './message-list';
import type { UseChatOptions } from './types';
import { useChat } from './use-chat';

interface ChatbotProps extends UseChatOptions {
  className?: string | undefined;
  placeholder?: string | undefined;
}

export function Chatbot({ className, placeholder, ...chatOptions }: ChatbotProps) {
  const { messages, isLoading, send } = useChat(chatOptions);

  return (
    <div className={cn('flex h-full flex-col overflow-hidden bg-white', className)}>
      <MessageList messages={messages} isLoading={isLoading} />
      <Composer
        onSend={(text) => {
          void send(text);
        }}
        disabled={isLoading}
        placeholder={placeholder}
      />
    </div>
  );
}
