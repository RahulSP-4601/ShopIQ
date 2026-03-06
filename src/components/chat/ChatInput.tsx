"use client";

import { useState, useRef, useEffect } from "react";

export interface Attachment {
  id: string;
  type: "file" | "audio";
  name: string;
  size: number;
  url: string;
  mimeType: string;
  file?: File;
  blob?: Blob;
  path?: string; // Storage path for uploaded files
  uploaded?: boolean; // Whether file has been uploaded to storage
}

export interface UploadedAttachment {
  type: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  path: string;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: UploadedAttachment[]) => void;
  disabled?: boolean;
  placeholder?: string;
  isUploading?: boolean;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Ask about your store...",
  isUploading = false,
  onUploadStart,
  onUploadEnd,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRecordingRef = useRef<boolean>(false);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Store attachments in a ref for cleanup to avoid stale closure
  const attachmentsRef = useRef<Attachment[]>([]);
  attachmentsRef.current = attachments;

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      // Use ref to get current attachments at cleanup time
      attachmentsRef.current.forEach((att) => {
        if (att.url.startsWith("blob:")) {
          URL.revokeObjectURL(att.url);
        }
      });
    };
  }, []); // Empty dependency - only run on unmount

  const uploadAttachment = async (attachment: Attachment): Promise<UploadedAttachment | null> => {
    const fileOrBlob = attachment.file || attachment.blob;
    if (!fileOrBlob) return null;

    const formData = new FormData();
    if (attachment.file) {
      formData.append("file", attachment.file);
    } else if (attachment.blob) {
      // Create a File from Blob for audio recordings
      const file = new File([attachment.blob], attachment.name, {
        type: attachment.mimeType,
      });
      formData.append("file", file);
    }
    formData.append("type", attachment.type);

    try {
      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();

      // Defensive check for successful response with attachment data
      if (!data.success || !data.attachment) {
        throw new Error("Invalid upload response: missing attachment data");
      }

      const serverAttachment = data.attachment;

      // Validate required fields exist, fall back to local values if missing
      if (!serverAttachment.url) {
        throw new Error("Invalid upload response: missing URL");
      }

      // Validate type - only accept "file" or "audio", default based on local attachment
      const validType = serverAttachment.type === "audio" ? "audio" : "file";

      return {
        type: validType,
        name: serverAttachment.name || attachment.name,
        size: serverAttachment.size ?? attachment.size,
        mimeType: serverAttachment.mimeType || attachment.mimeType,
        url: serverAttachment.url,
        path: serverAttachment.path || "",
      };
    } catch (error) {
      console.error("Failed to upload attachment:", error);
      return null;
    }
  };

  const submitMessage = async () => {
    if ((message.trim() || attachments.length > 0) && !disabled && !isUploading) {
      const trimmedMessage = message.trim();

      // Upload attachments first if any
      let uploadedAttachments: UploadedAttachment[] | undefined;

      if (attachments.length > 0) {
        onUploadStart?.();
        uploadedAttachments = [];

        try {
          // Upload files sequentially to show accurate progress
          for (let i = 0; i < attachments.length; i++) {
            setUploadProgress(`Uploading ${i + 1}/${attachments.length}...`);
            const result = await uploadAttachment(attachments[i]);
            if (result) {
              uploadedAttachments.push(result);
            }
          }

          if (uploadedAttachments.length !== attachments.length) {
            // Some uploads failed
            const failedCount = attachments.length - uploadedAttachments.length;
            alert(`${failedCount} file(s) failed to upload. The message will be sent with successfully uploaded files.`);
          }
        } catch (error) {
          console.error("Upload error:", error);
          alert("Failed to upload files. Please try again.");
          onUploadEnd?.();
          setUploadProgress(null);
          return;
        }

        onUploadEnd?.();
        setUploadProgress(null);
      }

      // Revoke blob URLs before clearing
      attachments.forEach((att) => {
        if (att.url.startsWith("blob:")) {
          URL.revokeObjectURL(att.url);
        }
      });

      onSend(trimmedMessage, uploadedAttachments && uploadedAttachments.length > 0 ? uploadedAttachments : undefined);
      setMessage("");
      setAttachments([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    Array.from(files).forEach((file) => {
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return;
      }

      const attachment: Attachment = {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type: "file",
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        mimeType: file.type,
        file,
      };
      newAttachments.push(attachment);
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.url.startsWith("blob:")) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const getSupportedMimeType = () => {
    // Check for supported audio formats in order of preference
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/wav",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ""; // Let browser choose default
  };

  const startRecording = async () => {
    let stream: MediaStream | null = null;

    // Helper to cleanup stream and reset state on error
    const cleanupOnError = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      isCancelledRecordingRef.current = false;
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setIsRecording(false);
      setRecordingTime(0);
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (recorderError) {
        // MediaRecorder construction failed, cleanup stream
        cleanupOnError();
        throw recorderError;
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isCancelledRecordingRef.current = false;

      // Store the actual mimeType being used
      const actualMimeType = mediaRecorder.mimeType || "audio/webm";

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        // Handle MediaRecorder errors during recording
        cleanupOnError();
      };

      mediaRecorder.onstop = () => {
        // Check if recording was cancelled
        if (isCancelledRecordingRef.current) {
          isCancelledRecordingRef.current = false;
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: actualMimeType,
        });
        const audioUrl = URL.createObjectURL(audioBlob);

        const attachment: Attachment = {
          id: `audio-${Date.now()}`,
          type: "audio",
          name: `Recording ${new Date().toLocaleTimeString()}`,
          size: audioBlob.size,
          url: audioUrl,
          mimeType: actualMimeType,
          blob: audioBlob,
        };

        setAttachments((prev) => [...prev, attachment]);

        // Stop all tracks
        stream?.getTracks().forEach((track) => track.stop());
      };

      // Start recording with timeslice to get data chunks every 100ms
      try {
        mediaRecorder.start(100);
      } catch (startError) {
        // mediaRecorder.start() failed, cleanup
        cleanupOnError();
        throw startError;
      }

      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      // Ensure cleanup happens for any error after stream acquisition
      cleanupOnError();
      console.error("Error accessing microphone:", error);
      alert(
        "Could not access microphone. Please ensure you have granted permission."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Set flag before stopping to prevent onstop from creating attachment
      isCancelledRecordingRef.current = true;
      audioChunksRef.current = [];

      // Stop all tracks first
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());

      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  return (
    <form onSubmit={handleSubmit} className="relative">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 max-w-full">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="group relative flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              {attachment.type === "audio" ? (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                    <svg
                      className="h-4 w-4 text-emerald-600"
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
                  <div className="flex flex-col">
                    <span className="text-slate-700 font-medium text-xs">
                      {attachment.name}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {formatFileSize(attachment.size)}
                    </span>
                  </div>
                  <audio
                    key={attachment.id}
                    controls
                    className="h-8 w-24 sm:w-32"
                    preload="metadata"
                  >
                    <source src={attachment.url} type={attachment.mimeType} />
                  </audio>
                </>
              ) : isImage(attachment.mimeType) ? (
                <>
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="text-slate-700 font-medium text-xs max-w-[100px] truncate">
                      {attachment.name}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {formatFileSize(attachment.size)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-200">
                    <svg
                      className="h-4 w-4 text-slate-500"
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
                  <div className="flex flex-col">
                    <span className="text-slate-700 font-medium text-xs max-w-[100px] truncate">
                      {attachment.name}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {formatFileSize(attachment.size)}
                    </span>
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="ml-1 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
            </span>
            <span className="text-sm font-medium text-red-700">Recording</span>
          </div>
          <span className="text-sm text-red-600 font-mono">
            {formatTime(recordingTime)}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 transition-colors"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-1.5 sm:gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
        {/* File Attachment Button */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isRecording || isUploading}
          className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Attach file"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        </button>

        {/* Voice Recording Button */}
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isUploading}
          className={`flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
            isRecording
              ? "bg-red-100 text-red-600 hover:bg-red-200"
              : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isRecording ? "Stop recording" : "Record voice message"}
        >
          {isRecording ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
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
          )}
        </button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={uploadProgress || placeholder}
          disabled={disabled || isRecording || isUploading}
          rows={1}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-50 overflow-hidden hide-scrollbar min-w-0"
        />
        <button
          type="submit"
          disabled={disabled || isUploading || (!message.trim() && attachments.length === 0)}
          className="flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white transition-all hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400 hidden sm:block">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
