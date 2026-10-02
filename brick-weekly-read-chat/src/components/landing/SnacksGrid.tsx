import { ArrowUpRight } from 'lucide-react';

import { Chatbot } from '../snacks/chatbot';
import { SmartLink } from '../snacks/smart-link';
import { CurrentUserChip } from '../snacks/user-info';
import { DemoDatasetRefreshBanner } from './DemoDatasetRefreshBanner';

const CHATBOT_SYSTEM_PROMPT =
  "You're showcasing Pantry to a new teammate. Be concise and helpful. Respond in markdown when it helps (lists, code, links). If asked, the chatbot snack lives at pantry/snacks/chatbot/.";

const CHATBOT_GREETING = "Hi, I'm your friendly AI assistant. Ask me anything";

function SnackFrame({
  name,
  children,
  bodyClassName,
  className,
}: {
  name: string;
  children: React.ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <article
      className={`flex flex-col rounded-md border border-neutral-200 bg-white p-4 ${className ?? ''}`}
    >
      <div className="font-mono text-[11px] text-neutral-500">{name}</div>
      <div className={`mt-2 ${bodyClassName ?? 'flex flex-1 items-center justify-center'}`}>
        {children}
      </div>
    </article>
  );
}

export function SnacksGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <SnackFrame
        name="snacks/chatbot"
        bodyClassName="mt-2 h-[320px] overflow-hidden"
        className="lg:col-span-7"
      >
        <Chatbot
          systemPrompt={CHATBOT_SYSTEM_PROMPT}
          greeting={CHATBOT_GREETING}
          className="h-full"
        />
      </SnackFrame>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-1 xl:grid-cols-1">
        <SnackFrame name="snacks/smart-link">
          <SmartLink
            href="https://github.com/domo-domosapiens/pantry/tree/main/snacks/smart-link"
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white no-underline transition-colors duration-150 hover:bg-neutral-800 hover:no-underline"
          >
            <span>Open snack source</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </SmartLink>
        </SnackFrame>

        <SnackFrame name="snacks/user-info">
          <CurrentUserChip />
        </SnackFrame>

        <SnackFrame name="snacks/dataset-refresh-banner">
          <DemoDatasetRefreshBanner className="w-full" />
        </SnackFrame>
      </div>
    </div>
  );
}
