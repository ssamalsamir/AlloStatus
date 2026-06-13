"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Why is my buffer low today?",
  "What's the one thing to focus on?",
  "How do I steady my sleep?",
];

// A floating, personalized chat. It posts the current reading's seed so the
// server can ground Gemini in this exact profile, and streams the reply in as
// plain text.
export function ChatWidget({ seed }: { seed?: number }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setBusy(true);

    const outgoing: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...outgoing, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: outgoing, seed }),
      });
      if (!res.body) throw new Error("no stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
      if (!acc.trim()) {
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = {
            role: "assistant",
            content: "I couldn't get a reply just now — the AI credential may be missing or not unlocked yet.",
          };
          return next;
        });
      }
    } catch {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = {
          role: "assistant",
          content: "Sorry — I couldn't reach the chat just now.",
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Ask about your reading"}
        className="btn-primary fixed bottom-5 right-5 z-40 size-14 rounded-full p-0 shadow-lg"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {open && (
        <div className="card fixed bottom-24 right-5 z-40 flex max-h-[70vh] w-[min(92vw,24rem)] flex-col overflow-hidden p-0">
          <div className="border-b border-border px-5 py-4">
            <p className="font-display text-base">Ask about your reading</p>
            <p className="text-xs text-muted">Personalized to the buffer you&apos;re viewing</p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-2.5">
                <p className="px-1 text-sm text-muted">Try asking:</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="block w-full rounded-2xl bg-surface-2 px-3.5 py-2.5 text-left text-sm transition hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((m, i) => <Bubble key={i} msg={m} busy={busy && i === messages.length - 1} />)
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="min-w-0 flex-1 rounded-full bg-surface-2 px-4 py-2.5 text-sm outline-none placeholder:text-muted-2"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="btn-primary size-10 rounded-full p-0 disabled:opacity-40"
              aria-label="Send"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ msg, busy }: { msg: Msg; busy: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3.5 py-2.5 text-sm text-white"
            : "max-w-[85%] rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-2.5 text-sm leading-relaxed"
        }
      >
        {msg.content || (busy ? <TypingDots /> : null)}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" role="status" aria-label="Assistant is typing">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </span>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
