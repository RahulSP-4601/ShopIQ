"use client";

import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "USER" | "ASSISTANT";
  content: string;
  isLoading?: boolean;
}

export function ChatMessage({ role, content, isLoading }: ChatMessageProps) {
  const isUser = role === "USER";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
            : "bg-slate-100 text-slate-900"
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" />
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {content}
          </div>
        )}
      </div>
    </div>
  );
}
