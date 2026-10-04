"use client";

import { useState, useRef, useCallback, useId } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void | boolean | Promise<void | boolean>;
  isSendDisabled?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isDisabled = false,
  isSendDisabled = false,
  placeholder = "Ask a question…",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const helpId = useId();

  const sending = useRef(false);
  const handleSend = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || isDisabled || isSendDisabled || sending.current) return;
    sending.current = true;
    try {
      const result = onSend(trimmed);
      const accepted = result instanceof Promise ? await result : result;
      if (accepted === false) return; // Keep the draft on transport, quota or session failure.
      setValue("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch { /* The parent reports failures; preserve the draft if its transport rejects. */ }
    finally { sending.current = false; }
  }, [value, isDisabled, isSendDisabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  const hasContent = value.trim().length > 0;

  return (
    <div className="border-t border-border/50 bg-background p-3 sm:p-4">
      <div
        className={cn(
          "relative flex items-end gap-2 rounded-xl border bg-card transition-all duration-200",
          isFocused
            ? "border-primary ring-1 ring-primary/30"
            : "border-border/60 hover:border-border"
        )}
      >
        <div className="relative min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            aria-label="Message to Digital Twin"
            aria-describedby={helpId}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              handleInput();
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className={cn(
              "w-full resize-none bg-transparent px-4 py-3 text-base font-sans leading-relaxed",
              "placeholder:text-muted-foreground focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "scrollbar-none"
            )}
            style={{ maxHeight: "120px", scrollbarWidth: "none" }}
          />
        </div>

        <div className="flex items-center gap-1 p-2">
            <button
              type="button"
              aria-label="Send message"
              onClick={handleSend}
              disabled={isDisabled || isSendDisabled || !hasContent}
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-200",
                hasContent && !isDisabled && !isSendDisabled
                  ? "cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Send className="h-4 w-4" />
            </button>
        </div>
      </div>

      <p id={helpId} className="mt-2 text-center text-xs font-sans text-muted-foreground">
        AI responses are generated from the expert&apos;s knowledge base
        <span className="mx-1.5 inline-block h-0.5 w-0.5 rounded-full bg-muted-foreground align-middle" />
        <kbd className="rounded-md border border-border/50 bg-card px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          Shift+Enter
        </kbd>{" "}
        for new line
      </p>
    </div>
  );
}
