"use client";

import { readChatResponse } from "./read-chat-response";
import { toMessageSources } from "@/lib/ai/citations";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, Brain, Plus, History, MessageSquare, X, ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
  const [sendFailure, setSendFailure] = useState<{ kind: "before-response" | "interrupted" | "cancelled" | "session" | "deadline"; sessionId: string | null; assistantId?: string } | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const recoveryRef = useRef(false);
  useEffect(() => () => { const request = requestRef.current; requestRef.current = null; request?.abort(); }, [expertId]);
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
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);
  const userScrolledUp = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }, []);

  // Only auto-scroll when a new message is added (not during streaming updates)
  useEffect(() => {
    if (messages.length !== prevMessageCount.current) {
      prevMessageCount.current = messages.length;
      userScrolledUp.current = false; // Reset on new message
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // Auto-scroll when typing indicator appears
  useEffect(() => {
    if (isTyping) {
      userScrolledUp.current = false;
      scrollToBottom();
    }
  }, [isTyping, scrollToBottom]);

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
              sources: toMessageSources(msg.sources),
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
                sources: toMessageSources(msg.sources),
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
    setSendFailure(null);
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
    setSendFailure(null);
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
          sources: toMessageSources(msg.sources),
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
      if (requestRef.current || sendFailure) return false;
      const request = new AbortController();
      requestRef.current = request;
      setIsStreaming(true);
      setThinkingSteps([]);
      setIsThinkingComplete(false);

      // Ensure we have a session before sending
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        activeSessionId = await createSession();
        if (!activeSessionId) {
          setSendFailure({ kind: "session", sessionId: null });
          requestRef.current = null;
          setIsStreaming(false);
          return false;
        }
      }

      if (requestRef.current !== request) return false;
      if (request.signal.aborted) {
        setSendFailure({ kind: "cancelled", sessionId: activeSessionId });
        requestRef.current = null;
        setIsStreaming(false);
        return false;
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

      let receivedResponse = false;
      let beforeResponseKind: "before-response" | "cancelled" | "deadline" = "before-response";
      try {
        const res = await fetch(`/api/chat/sessions/${activeSessionId}/messages`, {
          signal: request.signal,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (!res.ok) {
          if (res.status === 504) beforeResponseKind = "deadline";
          if (res.status === 499) beforeResponseKind = "cancelled";
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
                return false;
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
                return false;
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

        receivedResponse = true;
        let fullContent = "";
        await readChatResponse(reader, (event) => {
          if (requestRef.current !== request) return;
          if (event.thinking) setThinkingSteps(prev => [...prev, event.thinking!]);
          if (event.content) {
            setIsThinkingComplete(true);
            fullContent += event.content;
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m));
          }
          if (event.messageId) setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, id: event.messageId!, sources: toMessageSources(event.sources) } : m));
        });
        // Background refetch of memory count after streaming completes
        fetch(`/api/chat/sessions/${activeSessionId}/memories`)
          .then(r => r.json())
          .then(d => setMemoryCount(d.count))
          .catch(() => {});

        // Account usage belongs to the server, including interrupted/failed requests.
        try {
          const usage = await fetch(`/api/experts/${encodeURIComponent(expertId)}/trial-status`, { signal: request.signal });
          if (requestRef.current === request) setTrialStatus(usage.ok ? await usage.json() : null);
        } catch { if (requestRef.current === request) setTrialStatus(null); }
        return true;
      } catch {
        if (requestRef.current === request) {
          setTrialStatus(null);
          setSendFailure({ kind: request.signal.aborted ? "cancelled" : receivedResponse ? "interrupted" : beforeResponseKind, sessionId: activeSessionId, assistantId });
          // Empty assistant placeholders are not answers; partial text remains visible.
          setMessages(prev => prev.filter(m => m.id !== assistantId || !!m.content));
        }
        return false;
      } finally {
        if (requestRef.current === request) {
          requestRef.current = null;
          setIsTyping(false);
          setIsStreaming(false);
        }
      }
    },
    [sessionId, createSession, sendFailure, expertId]
  );

  const retryConnection = useCallback(async () => {
    if (recoveryRef.current || !sendFailure) return;
    recoveryRef.current = true;
    setIsRecovering(true);
    setRecoveryFailed(false);
    try {
      let target = sendFailure.sessionId;
      if (!target) {
        const list = await fetch(`/api/chat/sessions?expertId=${encodeURIComponent(expertId)}`);
        if (!list.ok) throw new Error("Cannot check sessions");
        const sessions = await list.json();
        if (!Array.isArray(sessions)) throw new Error("Invalid sessions");
        target = sessions[0]?.id ?? null;
      }
      if (target) {
        const response = await fetch(`/api/chat/sessions/${target}`);
        if (!response.ok) throw new Error("Cannot check conversation");
        const session = await response.json();
        if (!Array.isArray(session.messages)) throw new Error("Invalid conversation");
        setSessionId(target);
        setMessages(session.messages.map((message: Message) => ({ ...message, sources: toMessageSources(message.sources) })));
      }
      const usage = await fetch(`/api/experts/${encodeURIComponent(expertId)}/trial-status`);
      if (!usage.ok) throw new Error("Cannot check usage");
      setTrialStatus(await usage.json());
      setSendFailure(null);
    } catch { setRecoveryFailed(true); }
    finally { recoveryRef.current = false; setIsRecovering(false); }
  }, [sendFailure, expertId]);

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

  const handleForceScrollToBottom = useCallback(() => {
    userScrolledUp.current = false;
    setShowScrollButton(false);
    bottomRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);

  return (
    <div className="studio-chat flex h-full min-h-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg shadow-black/5">
      {/* Session History Panel -- desktop: side panel, mobile: overlay */}
      <AnimatePresence>
        {showHistory && (
          <>
            {/* Mobile overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm sm:hidden"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              initial={{ x: -264, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -264, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "z-50 flex h-full w-64 shrink-0 flex-col border-r border-border/50 bg-gradient-to-b from-card via-card to-muted/20",
                "fixed left-0 top-0 bottom-0 sm:relative sm:left-auto sm:top-auto sm:bottom-auto"
              )}
            >
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                    <History className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer rounded-lg sm:hidden" onClick={() => setShowHistory(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-0.5">
                  {sessionHistory.map((s, index) => (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.2 }}
                      onClick={() => handleSwitchSession(s.id)}
                      className={cn(
                        "group w-full cursor-pointer rounded-lg px-3 py-2.5 text-left transition-all duration-200",
                        s.id === sessionId
                          ? "bg-primary/8 border border-primary/20 shadow-sm shadow-primary/5"
                          : "hover:bg-muted/60 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-colors",
                          s.id === sessionId ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )} />
                        <p className={cn(
                          "truncate text-xs font-medium",
                          s.id === sessionId && "text-primary"
                        )}>
                          {s.title || "Chat"}
                        </p>
                      </div>
                      {s.lastMessage && (
                        <p className="mt-1 truncate pl-[22px] text-[10px] text-muted-foreground">
                          {s.lastMessage}
                        </p>
                      )}
                      <p className="mt-0.5 pl-[22px] text-[10px] text-muted-foreground">
                        {formatRelativeDate(s.updatedAt)}
                      </p>
                    </motion.button>
                  ))}
                  {sessionHistory.length === 0 && (
                    <div className="px-3 py-8 text-center">
                      <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-xs text-muted-foreground">
                        No previous chats
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="relative flex items-center gap-2 border-b border-border/50 bg-gradient-to-r from-card via-card to-muted/10 px-3 py-3 sm:gap-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0 cursor-pointer rounded-lg transition-colors",
              showHistory && "bg-primary/10 text-primary"
            )}
            onClick={() => setShowHistory(!showHistory)}
            title="Chat history"
            aria-label="Chat history"
            aria-expanded={showHistory}
          >
            <History className="h-4 w-4" />
          </Button>

          {/* Expert avatar with gradient ring */}
          <div className="relative shrink-0 rounded-full bg-gradient-to-br from-primary/40 via-primary/20 to-primary/40 p-[2px]">
            <Avatar className="h-8 w-8 border-2 border-card sm:h-9 sm:w-9">
              <AvatarImage src={expertImage ?? undefined} alt={expertName} />
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {getInitials(expertName)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{expertName}</h3>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-2.5 w-2.5 text-primary" />
              <p className="text-[10px] text-muted-foreground sm:text-xs">AI Digital Twin</p>
            </div>
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
              <div className="hidden items-center gap-1.5 rounded-full border border-border/50 bg-card px-2.5 py-1 text-[10px] text-muted-foreground sm:flex">
                <Brain className="h-3 w-3 text-primary" />
                <span className="font-medium">{memoryCount}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 cursor-pointer gap-1.5 rounded-lg border border-border/40 bg-card text-xs hover:bg-muted hover:border-border"
              onClick={handleNewChat}
              disabled={isStreaming || isLoading || isRecovering}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div
          className="relative flex-1 overflow-y-auto bg-gradient-to-b from-muted/5 via-transparent to-muted/10 p-4"
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            userScrolledUp.current = !isNearBottom;
            setShowScrollButton(!isNearBottom && messages.length > 3);
          }}
        >
          {/* Empty state */}
          {messages.length === 0 && !isTyping && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border border-primary/10 shadow-lg shadow-primary/5">
                  <Bot className="h-10 w-10 text-primary/70" />
                </div>
              </div>
              <h3 className="mt-6 text-lg font-semibold">
                Chat with {expertName}&apos;s AI Twin
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Ask questions and get answers based on {expertName}&apos;s
                knowledge base and expertise.
              </p>
            </motion.div>
          )}

          {/* Loading state */}
          {isLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                <div className="absolute inset-0 animate-ping rounded-full border border-primary/10" />
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                Loading conversation...
              </p>
            </div>
          )}

          {/* Messages list */}
          <div className="space-y-5">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={{ ...message, rating: ratedMessages[message.id] ?? message.rating }}
                expertName={expertName}
                expertImage={expertImage}
                userName={currentUserName}
                userImage={currentUserImage}
                onRate={message.id === sendFailure?.assistantId ? undefined : handleRate}
              />
            ))}
          </div>

          {/* Thinking steps */}
          {thinkingSteps.length > 0 && isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <ThinkingSteps steps={thinkingSteps} isComplete={isThinkingComplete} />
            </motion.div>
          )}

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="mt-5 flex items-start gap-3"
              >
                <div className="relative shrink-0 rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-primary/30 p-[2px]">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={expertImage ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {getInitials(expertName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2"
            >
              <button
                onClick={handleForceScrollToBottom}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border/60 bg-card px-3.5 py-1.5 text-xs font-medium text-foreground shadow-lg shadow-black/10 backdrop-blur-sm transition-all hover:bg-muted hover:text-foreground hover:shadow-xl"
              >
                <ChevronDown className="h-3.5 w-3.5" />
                New messages
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isStreaming && <div className="border-t border-border px-4 py-2"><Button type="button" variant="outline" className="min-h-11" onClick={() => requestRef.current?.abort()}>Stop response</Button></div>}
        {sendFailure && <div role={sendFailure.kind === "cancelled" ? "status" : "alert"} className="border-t border-border bg-muted/30 p-4 text-sm">
          <p className="font-medium">{sendFailure.kind === "cancelled" ? "Response stopped." : sendFailure.kind === "interrupted" ? "The response was interrupted. The partial answer may be incomplete." : sendFailure.kind === "deadline" ? "The response timed out before it started." : sendFailure.kind === "session" ? "We couldn’t open the conversation." : "We couldn’t receive a response."}</p>
          <p className="mt-1 text-muted-foreground">Your draft is preserved. The question may already be saved or counted. Retry connection checks the saved conversation and usage without sending it again.</p>
          {recoveryFailed && <p className="mt-2 text-destructive">Connection still unavailable. Your draft is preserved.</p>}
          <Button type="button" variant="outline" className="mt-3 min-h-11" disabled={isRecovering} onClick={retryConnection}>{isRecovering ? "Checking conversation…" : "Retry connection"}</Button>
        </div>}
        {/* Input */}
        <ChatInput onSend={handleSend} isDisabled={isStreaming || isLoading || isRecovering} isSendDisabled={!!sendFailure} />
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
