"use client";

import { cn, getInitials, formatRelativeDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SourceCitation } from "./source-citation";
import { ThumbsUp, ThumbsDown, Clock } from "lucide-react";
import { motion } from "motion/react";

import type { MessageSource } from "@/lib/ai/citations";
export type { MessageSource } from "@/lib/ai/citations";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: MessageSource[];
  rating?: number | null;
}

interface ChatMessageProps {
  message: Message;
  expertName: string;
  expertImage?: string | null;
  userName?: string;
  userImage?: string | null;
  onRate?: (messageId: string, rating: 1 | -1) => void;
}

export function ChatMessage({
  message,
  expertName,
  expertImage,
  userName = "You",
  userImage,
  onRate,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
      className={cn(
        "flex items-start gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div className="mt-0.5 shrink-0">
        <Avatar className="h-8 w-8 border border-border">
          <AvatarImage
            src={(isUser ? userImage : expertImage) ?? undefined}
            alt={isUser ? userName : expertName}
          />
          <AvatarFallback className={cn(
            "text-xs font-medium font-sans",
            !isUser && "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
            isUser && "bg-muted text-muted-foreground"
          )}>
            {getInitials(isUser ? userName : expertName)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div
        className={cn(
          "max-w-[80%] space-y-1.5",
          isUser && "items-end text-right"
        )}
      >
        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "rounded-tr-md bg-blue-700 text-white"
              : "rounded-tl-md border border-border bg-card"
          )}
        >
          <p className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        <div className={cn(
          "flex items-center gap-1 px-1",
          isUser && "justify-end"
        )}>
          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
          <p className="text-[10px] font-sans text-muted-foreground">
            {formatRelativeDate(message.createdAt)}
          </p>
        </div>

        {/* Source citations */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.2 }}
          >
            <SourceCitation sources={message.sources} />
          </motion.div>
        )}

        {/* Rating buttons */}
        {!isUser && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <motion.button
              type="button"
              onClick={() => onRate?.(message.id, 1)}
              className={cn(
                "inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-colors duration-200",
                message.rating === 1
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Thumbs up"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </motion.button>
            <motion.button
              type="button"
              onClick={() => onRate?.(message.id, -1)}
              className={cn(
                "inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-colors duration-200",
                message.rating === -1
                  ? "bg-red-500/10 text-red-500"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Thumbs down"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
