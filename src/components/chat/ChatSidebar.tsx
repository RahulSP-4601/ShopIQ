"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    messages: number;
  };
}

interface ChatSidebarProps {
  storeName: string;
  storeDomain: string;
}

export function ChatSidebar({ storeName, storeDomain }: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetch("/api/chat/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    router.push("/chat");
    router.refresh();
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect? This will delete all your data."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/store", { method: "DELETE" });
      if (response.ok) {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  return (
    <aside className="flex w-72 flex-col border-r border-slate-200 bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-md shadow-emerald-500/25">
          S
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-slate-900 truncate">{storeName}</h1>
          <p className="text-xs text-slate-500 truncate">{storeDomain}</p>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={startNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-emerald-600 hover:to-teal-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <p className="mb-2 px-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
          Recent Chats
        </p>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-4 text-sm text-slate-400 text-center">
            No conversations yet
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => router.push(`/chat/${conversation.id}`)}
                className="w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
              >
                <p className="text-sm text-slate-700 truncate">
                  {conversation.title || "Untitled"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {conversation._count.messages} messages
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 p-3 space-y-2">
        <button
          onClick={() => router.push("/reports")}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Reports
        </button>
        <button
          onClick={handleDisconnect}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Disconnect Store
        </button>
      </div>
    </aside>
  );
}
