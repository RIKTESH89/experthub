"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Brain, Plus, History, MessageSquare, X } from "lucide-react";
import { getInitials, formatRelativeDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChatMessage, type Message } from "./chat-message";
import { ChatInput } from "./chat-input";
import { TypingIndicator } from "./typing-indicator";
import { ThinkingSteps } from "./thinking-steps";
import { TrialCounter } from "./trial-counter";
import { TrialPaywall } from "./trial-paywall";
import { ShareButton } from "./share-button";

interface ChatInterfaceProps {
  expertId: string;
  expertName: string;
  expertImage?: string | null;
  currentUserName?: string;
  currentUserImage?: string | null;
}

export function ChatInterface({
  expertId,
  expertName,
  expertImage,
  currentUserName = "You",
  currentUserImage,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [trialStatus, setTrialStatus] = useState<{
    questionsUsed: number;
    questionsAllowed: number;
    hasSubscription: boolean;
    hasTrialAccess: boolean;
    tier?: string | null;
    isUnlimited?: boolean;
  } | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [isThinkingComplete, setIsThinkingComplete] = useState(false);
  const [ratedMessages, setRatedMessages] = useState<Record<string, number>>({});
  const [sessionHistory, setSessionHistory] = useState<{
    id: string;
    title?: string;
    updatedAt: string;
    lastMessage?: string;
  }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Create a new chat session and return its id
  const createSession = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertId }),
      });
      if (!res.ok) {
        if (res.status === 403) {
          try {
            const errorData = await res.json();
            if (errorData.code === "TRIAL_EXHAUSTED") {
              setTrialStatus({
                questionsUsed: errorData.questionsUsed ?? 0,
                questionsAllowed: errorData.questionsAllowed ?? 3,
                hasSubscription: false,
                hasTrialAccess: false,
              });
              setShowPaywall(true);
            }
          } catch {
            // ignore parse errors
          }
        }
        return null;
      }
      const session = await res.json();
      setSessionId(session.id);

      // Fetch memory count for new session
      fetch(`/api/chat/sessions/${session.id}/memories`)
        .then(r => r.json())
        .then(d => setMemoryCount(d.count))
        .catch(() => {});

      // If the session was created with a greeting message, load it
      if (session.expertProfile?.twinGreeting) {
        // Fetch the full session to get the greeting message with its id
        const fullRes = await fetch(`/api/chat/sessions/${session.id}`);
        if (fullRes.ok) {
          const fullSession = await fullRes.json();
          const loadedMessages: Message[] = (fullSession.messages ?? []).map(
            (msg: { id: string; role: string; content: string; createdAt: string; sources?: unknown }) => ({
              id: msg.id,
              role: msg.role as "user" | "assistant",
              content: msg.content,
              createdAt: msg.createdAt,
              sources: Array.isArray(msg.sources) ? msg.sources : [],
            })
          );
          setMessages(loadedMessages);
        }
      } else {
        setMessages([]);
      }

      return session.id;
    } catch {
      return null;
    }
  }, [expertId]);

  // Load existing session or create one on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      try {
        // 1. Fetch existing sessions for this expert
        const res = await fetch(`/api/chat/sessions?expertId=${encodeURIComponent(expertId)}`);
        if (!res.ok) {
          // If listing fails, try creating a new session
          await createSession();
          return;
        }

        const sessions = await res.json();
        if (cancelled) return;

        // Store session history for the sidebar
        if (Array.isArray(sessions)) {
          setSessionHistory(
            sessions.map((s: { id: string; title?: string; updatedAt: string; messages?: { content: string }[] }) => ({
              id: s.id,
              title: s.title || "Chat",
              updatedAt: s.updatedAt,
              lastMessage: s.messages?.[0]?.content?.slice(0, 60) || "",
            }))
          );
        }

        if (Array.isArray(sessions) && sessions.length > 0) {
          // 2. Load the most recent session's messages
          const mostRecent = sessions[0]; // already sorted by updatedAt desc
          setSessionId(mostRecent.id);

          const sessionRes = await fetch(`/api/chat/sessions/${mostRecent.id}`);
          if (cancelled) return;

          if (sessionRes.ok) {
            const fullSession = await sessionRes.json();
            const loadedMessages: Message[] = (fullSession.messages ?? []).map(
              (msg: { id: string; role: string; content: string; createdAt: string; sources?: unknown }) => ({
                id: msg.id,
                role: msg.role as "user" | "assistant",
                content: msg.content,
                createdAt: msg.createdAt,
                sources: Array.isArray(msg.sources) ? msg.sources : [],
              })
            );
            setMessages(loadedMessages);
          }

          // Fetch memory count for loaded session
          fetch(`/api/chat/sessions/${mostRecent.id}/memories`)
            .then(r => r.json())
            .then(d => { if (!cancelled) setMemoryCount(d.count); })
            .catch(() => {});
        } else {
          // 3. No sessions exist — create one
          await createSession();
        }
      } catch {
        // If everything fails, try to create a fresh session
        if (!cancelled) {
          await createSession();
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    init();

    // Fetch trial status
    async function fetchTrialStatus() {
      try {
        const res = await fetch(
          `/api/experts/${encodeURIComponent(expertId)}/trial-status`
        );
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setTrialStatus(data);
          }
        }
      } catch {
        // Trial status fetch is non-critical
      }
    }
    fetchTrialStatus();

    return () => {
      cancelled = true;
    };
  }, [expertId, createSession]);

  // Start a new chat session (used by the "New Chat" button)
  const handleNewChat = useCallback(async () => {
    setMessages([]);
    setSessionId(null);
    setIsLoading(true);
    setShowHistory(false);
    await createSession();
    // Refresh session list
    fetch(`/api/chat/sessions?expertId=${encodeURIComponent(expertId)}`)
      .then(r => r.json())
      .then(sessions => {
        if (Array.isArray(sessions)) {
          setSessionHistory(
            sessions.map((s: { id: string; title?: string; updatedAt: string; messages?: { content: string }[] }) => ({
              id: s.id,
              title: s.title || "Chat",
              updatedAt: s.updatedAt,
              lastMessage: s.messages?.[0]?.content?.slice(0, 60) || "",
            }))
          );
        }
      })
      .catch(() => {});
    setIsLoading(false);
  }, [createSession, expertId]);

  // Switch to an existing session
  const handleSwitchSession = useCallback(async (targetSessionId: string) => {
    if (targetSessionId === sessionId) {
      setShowHistory(false);
      return;
    }
    setIsLoading(true);
    setShowHistory(false);
    try {
      const res = await fetch(`/api/chat/sessions/${targetSessionId}`);
      if (!res.ok) throw new Error("Failed to load session");
      const fullSession = await res.json();
      const loadedMessages: Message[] = (fullSession.messages ?? []).map(
        (msg: { id: string; role: string; content: string; createdAt: string; sources?: unknown }) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          createdAt: msg.createdAt,
          sources: Array.isArray(msg.sources) ? msg.sources : [],
        })
      );
      setSessionId(targetSessionId);
      setMessages(loadedMessages);
      // Fetch memory count for switched session
      fetch(`/api/chat/sessions/${targetSessionId}/memories`)
        .then(r => r.json())
        .then(d => setMemoryCount(d.count))
        .catch(() => {});
    } catch {
      // Stay on current session
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleSend = useCallback(
    async (content: string) => {
      setThinkingSteps([]);
      setIsThinkingComplete(false);

      // Ensure we have a session before sending
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        activeSessionId = await createSession();
        if (!activeSessionId) {
          return; // Cannot send without a session
        }
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);
      setIsStreaming(true);

      const assistantId = crypto.randomUUID();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        sources: [],
      };

      try {
        const res = await fetch(`/api/chat/sessions/${activeSessionId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (!res.ok) {
          // Check if this is a trial exhaustion error
          if (res.status === 403) {
            try {
              const errorData = await res.json();
              if (errorData.code === "TRIAL_EXHAUSTED") {
                setTrialStatus((prev) => ({
                  questionsUsed: errorData.questionsUsed ?? prev?.questionsUsed ?? 0,
                  questionsAllowed: errorData.questionsAllowed ?? prev?.questionsAllowed ?? 3,
                  hasSubscription: false,
                  hasTrialAccess: false,
                }));
                setShowPaywall(true);
                // Remove the optimistic user message
                setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
                setIsTyping(false);
                setIsStreaming(false);
                return;
              }
              if (errorData.code === "QUOTA_EXHAUSTED") {
                setTrialStatus((prev) => ({
                  questionsUsed: errorData.questionsUsed ?? prev?.questionsUsed ?? 0,
                  questionsAllowed: errorData.questionsAllowed ?? prev?.questionsAllowed ?? 0,
                  hasSubscription: true,
                  hasTrialAccess: false,
                  tier: errorData.tier ?? prev?.tier,
                  isUnlimited: false,
                }));
                setShowPaywall(true);
                setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
                setIsTyping(false);
                setIsStreaming(false);
                return;
              }
            } catch {
              // Fall through to generic error
            }
          }
          throw new Error("Failed to send message");
        }

        setIsTyping(false);
        setMessages((prev) => [...prev, assistantMessage]);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.thinking) {
                setThinkingSteps(prev => [...prev, parsed.thinking]);
                continue;
              }

              if (parsed.content) {
                if (fullContent === "") {
                  setIsThinkingComplete(true);
                }
                fullContent += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullContent } : m
                  )
                );
              }

              if (parsed.done && parsed.sources) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, sources: parsed.sources }
                      : m
                  )
                );
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }
        // Background refetch of memory count after streaming completes
        fetch(`/api/chat/sessions/${activeSessionId}/memories`)
          .then(r => r.json())
          .then(d => setMemoryCount(d.count))
          .catch(() => {});

        // Update usage counter after successful send
        if (trialStatus && !trialStatus.isUnlimited) {
          setTrialStatus((prev) =>
            prev
              ? {
                  ...prev,
                  questionsUsed: prev.questionsUsed + 1,
                  hasTrialAccess: prev.questionsAllowed === -1 ||
                    prev.questionsUsed + 1 < prev.questionsAllowed,
                }
              : prev
          );
        }
      } catch {
        setIsTyping(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    m.content ||
                    "Sorry, I encountered an error. Please try again.",
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, createSession, trialStatus]
  );

  const handleRate = useCallback(
    async (messageId: string, rating: 1 | -1) => {
      if (!sessionId) return;
      setRatedMessages((prev) => ({ ...prev, [messageId]: rating }));
      try {
        await fetch(`/api/chat/sessions/${sessionId}/messages/${messageId}/rate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating }),
        });
      } catch {
        // Revert on failure
        setRatedMessages((prev) => {
          const next = { ...prev };
          delete next[messageId];
          return next;
        });
      }
    },
    [sessionId]
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-lg border border-border bg-card">
      {/* Session History Panel — desktop: side panel, mobile: overlay */}
      {showHistory && (
        <>
          {/* Mobile overlay backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 sm:hidden"
            onClick={() => setShowHistory(false)}
          />
          <div className={cn(
            "z-50 flex h-full w-64 shrink-0 flex-col border-r border-border bg-card",
            "fixed left-0 top-0 bottom-0 sm:relative sm:left-auto sm:top-auto sm:bottom-auto"
          )}>
            <div className="flex items-center justify-between border-b border-border px-3 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chat History</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:hidden" onClick={() => setShowHistory(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sessionHistory.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSwitchSession(s.id)}
                    className={cn(
                      "w-full rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/80",
                      s.id === sessionId && "bg-primary/10 border border-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <p className="truncate text-xs font-medium">{s.title || "Chat"}</p>
                    </div>
                    {s.lastMessage && (
                      <p className="mt-0.5 truncate pl-5 text-[10px] text-muted-foreground">
                        {s.lastMessage}
                      </p>
                    )}
                    <p className="mt-0.5 pl-5 text-[10px] text-muted-foreground/60">
                      {formatRelativeDate(s.updatedAt)}
                    </p>
                  </button>
                ))}
                {sessionHistory.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No previous chats
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      )}

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-3 sm:gap-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setShowHistory(!showHistory)}
            title="Chat history"
          >
            <History className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
            <AvatarImage src={expertImage ?? undefined} alt={expertName} />
            <AvatarFallback className="text-xs">{getInitials(expertName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{expertName}</h3>
            <p className="text-[10px] text-muted-foreground sm:text-xs">AI Digital Twin</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {trialStatus &&
              !trialStatus.isUnlimited &&
              trialStatus.questionsAllowed > 0 && (
                <TrialCounter
                  questionsUsed={trialStatus.questionsUsed}
                  questionsAllowed={trialStatus.questionsAllowed}
                  isSubscribed={trialStatus.hasSubscription}
                />
              )}
            <ShareButton sessionId={sessionId} />
            {memoryCount > 0 && (
              <div className="hidden items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground sm:flex">
                <Brain className="h-3 w-3" />
                {memoryCount}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleNewChat}
              disabled={isStreaming || isLoading}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
            <div className="flex h-2 w-2 rounded-full bg-green-500" />
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 && !isTyping && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-semibold">
                Chat with {expertName}&apos;s AI Twin
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Ask questions and get answers based on {expertName}&apos;s
                knowledge base and expertise.
              </p>
            </div>
          )}

          {isLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-4 text-sm text-muted-foreground">
                Loading conversation...
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={{ ...message, rating: ratedMessages[message.id] ?? message.rating }}
                expertName={expertName}
                expertImage={expertImage}
                userName={currentUserName}
                userImage={currentUserImage}
                onRate={handleRate}
              />
            ))}
          </div>

          {thinkingSteps.length > 0 && isStreaming && (
            <div className="mt-4">
              <ThinkingSteps steps={thinkingSteps} isComplete={isThinkingComplete} />
            </div>
          )}

          {isTyping && (
            <div className="mt-4 flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={expertImage ?? undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(expertName)}
                </AvatarFallback>
              </Avatar>
              <TypingIndicator />
            </div>
          )}

          <div ref={bottomRef} />
        </ScrollArea>

        {/* Input */}
        <ChatInput onSend={handleSend} isDisabled={isStreaming || isLoading} />
      </div>

      {/* Trial Paywall Dialog */}
      <TrialPaywall
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        expertName={expertName}
        expertId={expertId}
        questionsUsed={trialStatus?.questionsUsed ?? 0}
        questionsAllowed={trialStatus?.questionsAllowed ?? 3}
        isQuotaExhausted={trialStatus?.hasSubscription && !trialStatus?.hasTrialAccess}
      />
    </div>
  );
}
