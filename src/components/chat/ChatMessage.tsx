"use client";

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
}

export function ChatMessage({
  role,
  content,
  isLoading,
  attachments,
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
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {content}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
