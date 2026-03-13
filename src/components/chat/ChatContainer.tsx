"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChatMessage, MessageAttachment } from "./ChatMessage";
import { ChatInput, UploadedAttachment } from "./ChatInput";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
  attachments?: MessageAttachment[];
}

interface ChatContainerProps {
  initialConversationId?: string;
  storeName?: string;
  isConnected?: boolean;
}

export function ChatContainer({
  initialConversationId,
  storeName = "your store",
  isConnected = false,
}: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load existing conversation
  useEffect(() => {
    if (initialConversationId && isConnected) {
      loadConversation(initialConversationId);
    }
  }, [initialConversationId, isConnected]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const loadConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setConversationId(id);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    }
  };

  // Convert uploaded attachments to display format with temporary IDs for optimistic UI
  const convertAttachmentsForOptimisticUI = (attachments?: UploadedAttachment[]): MessageAttachment[] | undefined => {
    if (!attachments || attachments.length === 0) return undefined;
    return attachments.map((att, index) => {
      // Validate type before using - only accept "file" or "audio", default to "file"
      const validType: "file" | "audio" = att.type === "audio" ? "audio" : "file";

      return {
        id: `temp-att-${Date.now()}-${index}`,
        type: validType,
        name: att.name,
        size: att.size,
        url: att.url,
        mimeType: att.mimeType,
      };
    });
  };

  const sendMessage = async (content: string, attachments?: UploadedAttachment[]) => {
    const optimisticAttachments = convertAttachmentsForOptimisticUI(attachments);

    if (!isConnected) {
      // Show message prompting to connect
      setMessages([
        {
          id: `prompt-${Date.now()}`,
          role: "USER",
          content,
          createdAt: new Date().toISOString(),
          attachments: optimisticAttachments,
        },
        {
          id: `response-${Date.now()}`,
          role: "ASSISTANT",
          content:
            "To answer questions about your store, I need access to your data. Please click the \"Connect Store\" button in the top right to connect your store. Once connected, I'll be able to analyze your sales, products, customers, and more!",
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    // Create optimistic user message with temporary ID
    const tempMessageId = `temp-${Date.now()}`;
    const optimisticUserMessage: Message = {
      id: tempMessageId,
      role: "USER",
      content,
      createdAt: new Date().toISOString(),
      attachments: optimisticAttachments,
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);
    setIsLoading(true);

    try {
      // Build message content including attachment info
      let messageContent = content;
      if (attachments && attachments.length > 0) {
        const attachmentInfo = attachments.map((a) => {
          if (a.type === "audio") {
            return `[Voice Recording: ${a.name}]`;
          }
          return `[Attached file: ${a.name}]`;
        }).join("\n");

        if (messageContent) {
          messageContent = `${messageContent}\n\n${attachmentInfo}`;
        } else {
          messageContent = attachmentInfo;
        }
      }

      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          conversationId,
          attachments: attachments,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      setConversationId(data.conversationId);

      // Replace optimistic user message with server response (with real IDs)
      // and add the assistant message
      setMessages((prev) => {
        // Find and replace the optimistic message with server data
        const updatedMessages = prev.map((msg) =>
          msg.id === tempMessageId ? data.userMessage : msg
        );
        // Add the assistant response
        return [...updatedMessages, data.message];
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Add error message but keep the optimistic user message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "ASSISTANT",
          content:
            "Sorry, I encountered an error processing your request. Please try again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "What was my revenue last week?",
    "Which products are selling the best?",
    "Who are my top customers?",
    "Show me daily sales trends",
  ];

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_22%,_#ffffff_100%)]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-2 py-8 sm:px-4">
            <div className="w-full max-w-4xl">
              <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-10">
                <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  FRAX Commerce Copilot
                </div>

                <div className="mb-6 flex justify-center">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 shadow-[0_20px_50px_-24px_rgba(13,148,136,0.55)]">
                    <div className="absolute inset-1 rounded-[24px] bg-gradient-to-br from-teal-500/18 via-white/5 to-emerald-400/10" />
                    <Image
                      src="/logo-frax.png"
                      alt="FRAX"
                      width={58}
                      height={58}
                      className="relative z-10 h-14 w-14 object-contain"
                      priority
                    />
                  </div>
                </div>

                <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {isConnected ? "Welcome to your command center" : "Meet Frax"}
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  {isConnected
                    ? `Ask precise questions about ${storeName} and get decision-ready answers across revenue, products, customers, inventory, and marketplace performance.`
                    : "Connect a marketplace to unlock live commerce intelligence, conversational reporting, and proactive recommendations from Frax."}
                </p>

                <div className="mx-auto mt-8 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Coverage</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {isConnected ? "Live marketplace data" : "Connect once to activate"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {isConnected ? "Sales, customers, orders, products, and inventory in one place." : "Authorize your store and start with real business context."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Workflow</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">Natural-language analysis</p>
                    <p className="mt-1 text-sm text-slate-500">Ask direct questions instead of navigating dashboards and tabs.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Input</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">Files and voice supported</p>
                    <p className="mt-1 text-sm text-slate-500">Attach context, upload reports, or send a voice note when needed.</p>
                  </div>
                </div>

                {!isConnected && (
                  <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left">
                    <div className="flex items-start gap-3">
                      <svg
                        className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Connect your store for live answers</p>
                        <p className="mt-1 text-sm text-amber-700">
                          Use the marketplace connection flow first. Once connected, Frax can answer based on your actual store data instead of generic examples.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mx-auto mt-8 max-w-3xl text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {isConnected ? "Recommended prompts" : "Example prompts"}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        onClick={() => sendMessage(question)}
                        className="group rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/50 hover:shadow-[0_18px_40px_-28px_rgba(13,148,136,0.5)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium leading-6 text-slate-700 group-hover:text-slate-900">
                            {question}
                          </span>
                          <svg
                            className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-teal-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs font-medium text-slate-400">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span>Attach files</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span>Voice notes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Instant analysis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                attachments={message.attachments}
              />
            ))}
            {isLoading && (
              <ChatMessage role="ASSISTANT" content="" isLoading />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200/80 bg-white/85 p-4 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            onSend={sendMessage}
            disabled={isLoading}
            isUploading={isUploading}
            onUploadStart={() => setIsUploading(true)}
            onUploadEnd={() => setIsUploading(false)}
            placeholder={
              isConnected
                ? "Ask about your store..."
                : "Ask a question (connect store for real data)"
            }
          />
        </div>
      </div>
    </div>
  );
}
