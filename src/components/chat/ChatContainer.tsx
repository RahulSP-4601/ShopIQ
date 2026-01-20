"use client";

import { useState, useRef, useEffect } from "react";
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
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-2xl font-bold shadow-lg shadow-emerald-500/25">
                S
              </div>
              <h2 className="text-xl font-semibold text-slate-900">
                Welcome to ShopIQ
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isConnected
                  ? `Ask me anything about ${storeName}`
                  : "Your AI-powered analytics assistant"}
              </p>
            </div>

            {!isConnected && (
              <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 max-w-md">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-amber-500 mt-0.5 shrink-0"
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
                  <div className="text-left">
                    <p className="text-sm font-medium text-amber-800">
                      Connect your store for personalized insights
                    </p>
                    <p className="mt-1 text-xs text-amber-600">
                      Click &quot;Connect Store&quot; above to link your store and get
                      AI-powered analytics based on your real data.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="w-full max-w-md space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {isConnected ? "Try asking" : "Example questions"}
              </p>
              <div className="grid gap-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    onClick={() => sendMessage(question)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 transition-all hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature hints */}
            <div className="mt-8 flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>Attach files</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>Voice messages</span>
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
      <div className="border-t border-slate-200 bg-white p-4">
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
