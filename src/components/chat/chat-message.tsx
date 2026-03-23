import { cn, getInitials, formatRelativeDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SourceCitation } from "./source-citation";
import { ThumbsUp, ThumbsDown } from "lucide-react";

export interface MessageSource {
  title: string;
  snippet: string;
  url?: string;
}

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
    <div
      className={cn(
        "flex items-start gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      <Avatar className="mt-0.5 h-8 w-8 shrink-0">
        <AvatarImage
          src={(isUser ? userImage : expertImage) ?? undefined}
          alt={isUser ? userName : expertName}
        />
        <AvatarFallback className="text-xs">
          {getInitials(isUser ? userName : expertName)}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "max-w-[80%] space-y-1",
          isUser && "items-end text-right"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "rounded-tr-md bg-primary text-primary-foreground"
              : "rounded-tl-md bg-muted"
          )}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </p>
        </div>

        <p
          className={cn(
            "px-1 text-[10px] text-muted-foreground",
            isUser && "text-right"
          )}
        >
          {formatRelativeDate(message.createdAt)}
        </p>

        {!isUser && message.sources && message.sources.length > 0 && (
          <SourceCitation sources={message.sources} />
        )}

        {!isUser && (
          <div className="flex items-center gap-1 mt-1">
            <button
              type="button"
              onClick={() => onRate?.(message.id, 1)}
              className={cn(
                "inline-flex items-center justify-center rounded p-1 transition-colors hover:bg-muted",
                message.rating === 1 ? "text-green-500" : "text-muted-foreground"
              )}
              aria-label="Thumbs up"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onRate?.(message.id, -1)}
              className={cn(
                "inline-flex items-center justify-center rounded p-1 transition-colors hover:bg-muted",
                message.rating === -1 ? "text-red-500" : "text-muted-foreground"
              )}
              aria-label="Thumbs down"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
