"use client";

import { useState, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isDisabled = false,
  placeholder = "Ask a question…",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isDisabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isDisabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
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
            ? "border-blue-700/40 ring-1 ring-blue-700/20"
            : "border-border/60 hover:border-border"
        )}
      >
        <div className="relative min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            aria-label="Message to Digital Twin"
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
              "w-full resize-none bg-transparent px-4 py-3 text-sm font-sans leading-relaxed",
              "placeholder:text-muted-foreground focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "scrollbar-none"
            )}
            style={{ maxHeight: "120px", scrollbarWidth: "none" }}
          />
        </div>

        <div className="flex items-center gap-1 p-2">
          <AnimatePresence mode="wait">
            <motion.button
              key={hasContent ? "active" : "inactive"}
              type="button"
              aria-label="Send message"
              onClick={handleSend}
              disabled={isDisabled || !hasContent}
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-200",
                hasContent && !isDisabled
                  ? "cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={hasContent && !isDisabled ? { scale: 1.05 } : {}}
              whileTap={hasContent && !isDisabled ? { scale: 0.92 } : {}}
              transition={{ duration: 0.2 }}
            >
              <Send className="h-4 w-4" />
            </motion.button>
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-2 text-center text-[10px] font-sans text-muted-foreground">
        AI responses are generated from the expert&apos;s knowledge base
        <span className="mx-1.5 inline-block h-0.5 w-0.5 rounded-full bg-muted-foreground align-middle" />
        <kbd className="rounded-md border border-border/50 bg-card px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
          Shift+Enter
        </kbd>{" "}
        for new line
      </p>
    </div>
  );
}
