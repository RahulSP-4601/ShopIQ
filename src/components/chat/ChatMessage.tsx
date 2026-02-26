"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export interface MessageAttachment {
  id: string;
  type: "file" | "audio";
  name: string;
  size: number;
  url: string;
  mimeType: string;
}

interface ChatMessageProps {
  role: "USER" | "ASSISTANT";
  content: string;
  isLoading?: boolean;
  attachments?: MessageAttachment[];
  messageId?: string;
  feedback?: "positive" | "negative" | null;
  onFeedback?: (messageId: string, rating: "positive" | "negative") => void;
}

const MarkdownContent = memo(function MarkdownContent({
  content,
}: {
  content: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h3 className="text-base font-bold text-slate-900 mt-4 mb-2 first:mt-0">
            {children}
          </h3>
        ),
        h2: ({ children }) => (
          <h4 className="text-[0.9rem] font-bold text-slate-900 mt-3.5 mb-1.5 first:mt-0">
            {children}
          </h4>
        ),
        h3: ({ children }) => (
          <h5 className="text-sm font-semibold text-slate-800 mt-3 mb-1 first:mt-0">
            {children}
          </h5>
        ),
        p: ({ children }) => (
          <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-900">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="text-sm space-y-1 mb-2 last:mb-0 ml-5 list-disc marker:text-emerald-500">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="text-sm space-y-1 mb-2 last:mb-0 ml-5 list-decimal marker:text-emerald-500">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed text-sm pl-1">{children}</li>
        ),
        code: ({ className, children }) => {
          const hasLanguage = className?.includes("language-");
          const text = String(children).replace(/\n$/, "");
          const isBlock = hasLanguage || text.includes("\n");
          if (isBlock) {
            return (
              <pre className="bg-slate-800 text-slate-100 rounded-lg px-4 py-3 text-xs overflow-x-auto my-2">
                <code>{children}</code>
              </pre>
            );
          }
          return (
            <code className="bg-slate-200/70 text-emerald-700 px-1.5 py-0.5 rounded text-xs font-mono">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-emerald-400 pl-3 my-2 text-sm text-slate-600 italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-3 border-slate-200" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-2 rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-50 border-b border-slate-200">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold text-slate-700">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-slate-600 border-t border-slate-100">
            {children}
          </td>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

export function ChatMessage({
  role,
  content,
  isLoading,
  attachments,
  messageId,
  feedback,
  onFeedback,
}: ChatMessageProps) {
  const isUser = role === "USER";

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
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
          <>
            {/* Attachments */}
            {attachments && attachments.length > 0 && (
              <div className="mb-2 space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className={cn(
                      "rounded-lg p-2",
                      isUser ? "bg-white/10" : "bg-white"
                    )}
                  >
                    {attachment.type === "audio" ? (
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full",
                            isUser ? "bg-white/20" : "bg-emerald-100"
                          )}
                        >
                          <svg
                            className={cn(
                              "h-4 w-4",
                              isUser ? "text-white" : "text-emerald-600"
                            )}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-xs font-medium truncate",
                              isUser ? "text-white" : "text-slate-700"
                            )}
                          >
                            {attachment.name}
                          </p>
                          <p
                            className={cn(
                              "text-xs",
                              isUser ? "text-white/70" : "text-slate-400"
                            )}
                          >
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                        <audio
                          src={attachment.url}
                          controls
                          className="h-8 w-32"
                        />
                      </div>
                    ) : isImage(attachment.mimeType) ? (
                      <div>
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="max-w-full rounded-lg max-h-48 object-contain"
                        />
                        <p
                          className={cn(
                            "mt-1 text-xs",
                            isUser ? "text-white/70" : "text-slate-400"
                          )}
                        >
                          {attachment.name} ({formatFileSize(attachment.size)})
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded",
                            isUser ? "bg-white/20" : "bg-slate-200"
                          )}
                        >
                          <svg
                            className={cn(
                              "h-4 w-4",
                              isUser ? "text-white" : "text-slate-500"
                            )}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-xs font-medium truncate",
                              isUser ? "text-white" : "text-slate-700"
                            )}
                          >
                            {attachment.name}
                          </p>
                          <p
                            className={cn(
                              "text-xs",
                              isUser ? "text-white/70" : "text-slate-400"
                            )}
                          >
                            {formatFileSize(attachment.size)}
                          </p>
                        </div>
                        <a
                          href={attachment.url}
                          download={attachment.name}
                          className={cn(
                            "text-xs underline",
                            isUser
                              ? "text-white/80 hover:text-white"
                              : "text-emerald-600 hover:text-emerald-700"
                          )}
                        >
                          Download
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Message content */}
            {content && (
              isUser ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {content}
                </div>
              ) : (
                <MarkdownContent content={content} />
              )
            )}

            {/* Feedback buttons (assistant messages only) */}
            {!isUser && messageId && onFeedback && (
              <div className="mt-2 flex items-center gap-1.5 pt-1 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => onFeedback(messageId, "positive")}
                  className={cn(
                    "p-1 rounded transition-colors",
                    feedback === "positive"
                      ? "text-emerald-600"
                      : "text-slate-300 hover:text-emerald-500"
                  )}
                  title="Helpful"
                  aria-label="Helpful"
                  aria-pressed={feedback === "positive"}
                >
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    fill={feedback === "positive" ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback(messageId, "negative")}
                  className={cn(
                    "p-1 rounded transition-colors",
                    feedback === "negative"
                      ? "text-red-500"
                      : "text-slate-300 hover:text-red-400"
                  )}
                  title="Not helpful"
                  aria-label="Not helpful"
                  aria-pressed={feedback === "negative"}
                >
                  <svg
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    fill={feedback === "negative" ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"
                    />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
