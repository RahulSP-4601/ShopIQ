"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MarketplaceType } from "@prisma/client";
import { MARKETPLACE_COLORS, MARKETPLACE_NAMES } from "@/lib/marketplace/config";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    messages: number;
  };
}

interface ConnectedMarketplace {
  marketplace: string;
  name: string;
}

interface ChatSidebarProps {
  userName: string;
  userEmail: string;
  connectedMarketplaces: ConnectedMarketplace[];
  isOpen?: boolean;
  onClose?: () => void;
}

export function ChatSidebar({
  userName,
  userEmail,
  connectedMarketplaces,
  isOpen = false,
  onClose,
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMarketplaces, setShowMarketplaces] = useState(false);
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
    onClose?.();
    router.push("/chat");
    router.refresh();
  };

  const navigateTo = (path: string) => {
    onClose?.();
    router.push(path);
  };

  // Get user initials - handle empty/malformed userName defensively
  const initials =
    (userName || "")
      .split(" ")
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-slate-50 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Mobile Close Button */}
      <button
        onClick={onClose}
        className="absolute right-2 top-2 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
        aria-label="Close sidebar"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Header - User Info */}
      <div className="border-b border-slate-200 p-4 pt-12 lg:pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-slate-900 truncate">{userName}</h1>
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
          </div>
        </div>

        {/* Connected Marketplaces Accordion */}
        <button
          onClick={() => setShowMarketplaces(!showMarketplaces)}
          className="mt-3 flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 border border-slate-200 hover:border-slate-300 transition-colors"
        >
          <span className="text-xs font-medium text-slate-600">
            {connectedMarketplaces.length} Connected Marketplace
            {connectedMarketplaces.length !== 1 ? "s" : ""}
          </span>
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${showMarketplaces ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {showMarketplaces && (
          <div className="mt-2 space-y-1">
            {connectedMarketplaces.map((mp, index) => (
              <div
                key={`${mp.marketplace}-${index}`}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 border border-slate-100"
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      MARKETPLACE_COLORS[mp.marketplace as MarketplaceType] || "#6B7280",
                  }}
                />
                <span className="text-xs text-slate-700">
                  {MARKETPLACE_NAMES[mp.marketplace as MarketplaceType] || mp.marketplace}
                </span>
                <span className="text-xs text-slate-400 truncate ml-auto">
                  {mp.name !== mp.marketplace ? mp.name : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={startNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-teal-600 hover:to-emerald-700"
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
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-500" />
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
                onClick={() => navigateTo(`/chat/${conversation.id}`)}
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
      <div className="border-t border-slate-200 p-3 space-y-1">
        <button
          onClick={() => navigateTo("/account/marketplaces")}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-teal-600 font-medium transition-colors hover:bg-teal-50"
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
          Connect More Accounts
        </button>
        <button
          onClick={() => navigateTo("/reports")}
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
      </div>
    </aside>
  );
}
