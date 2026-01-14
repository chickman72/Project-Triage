"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ChatMode = "patient" | "provider";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatInterfaceProps = {
  mode: ChatMode;
  patientContext?: string | null;
  patientId?: string | null;
  onPatientUpdate?: (patient: unknown) => void;
};

export default function ChatInterface({
  mode,
  patientContext,
  patientId,
  onPatientUpdate
}: ChatInterfaceProps) {
  const initialMessage: ChatMessage = {
    role: "assistant",
    content:
      mode === "patient"
        ? "Hi, I'm here to help with your intake. What brings you in today?"
        : "Hello provider, ask me anything about your patient panel."
  };
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);
  const [intakeStatus, setIntakeStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const starterPrompts = [
    "Please brief me on this patient.",
    "Summarize active problems and key risks.",
    "List recent vitals and medications."
  ];
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const placeholder = useMemo(
    () =>
      mode === "patient"
        ? "Describe symptoms, duration, and severity..."
        : "Ask about a patient, labs, or trends...",
    [mode]
  );

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    setMessages([initialMessage]);
    setInput("");
    setIntakeStatus("idle");
  }, [mode]);

  useEffect(() => {
    if (mode !== "provider") return;
    if (!patientId) return;
    try {
      const saved = window.localStorage.getItem(`providerChat:${patientId}`);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (error) {
      // Ignore localStorage errors and fall back to initial message.
    }
    setMessages([initialMessage]);
  }, [mode, patientId]);

  useEffect(() => {
    if (mode !== "provider") return;
    if (!patientId) return;
    try {
      window.localStorage.setItem(
        `providerChat:${patientId}`,
        JSON.stringify(messages)
      );
    } catch (error) {
      // Ignore localStorage errors to avoid blocking the UI.
    }
  }, [mode, patientId, messages]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (mode === "provider" && !patientId) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please select a patient before sending provider queries."
        }
      ]);
      setInput("");
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed }
    ];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const endpoint = mode === "provider" ? "/api/provider/chat" : "/api/chat";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          messages: nextMessages,
          patientContext,
          patientId
        })
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = (await response.json()) as {
        message: string;
        patient?: unknown;
      };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message }
      ]);
      if (mode === "provider" && data.patient && onPatientUpdate) {
        onPatientUpdate(data.patient);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong while contacting the server."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendPreset = async (preset: string) => {
    if (isLoading) return;
    if (mode === "provider" && !patientId) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please select a patient before sending provider queries."
        }
      ]);
      return;
    }
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: preset }
    ];
    setMessages(nextMessages);
    setIsLoading(true);
    try {
      const endpoint = mode === "provider" ? "/api/provider/chat" : "/api/chat";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          messages: nextMessages,
          patientContext,
          patientId
        })
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data = (await response.json()) as {
        message: string;
        patient?: unknown;
      };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message }
      ]);
      if (mode === "provider" && data.patient && onPatientUpdate) {
        onPatientUpdate(data.patient);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong while contacting the server."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([initialMessage]);
    setInput("");
    if (mode === "provider" && patientId) {
      try {
        window.localStorage.setItem(
          `providerChat:${patientId}`,
          JSON.stringify([initialMessage])
        );
      } catch (error) {
        // Ignore localStorage errors.
      }
    }
  };

  const finishIntake = async () => {
    if (mode !== "patient") return;
    const intakePatientId = patientId ?? "patient-001";
    setIsSubmittingIntake(true);
    setIntakeStatus("idle");
    try {
      const response = await fetch("/api/intake/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: intakePatientId,
          chatHistory: messages
        })
      });

      if (!response.ok) {
        throw new Error("Intake submission failed");
      }

      setIntakeStatus("success");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Thanks! Your intake is complete and has been saved to your chart."
        }
      ]);
    } catch (error) {
      setIntakeStatus("error");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't save your intake yet. Please try again in a moment."
        }
      ]);
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <section className="glass-panel flex h-[620px] flex-col overflow-hidden rounded-3xl p-6">
      <header className="mb-4 flex items-center justify-between text-sm uppercase tracking-[0.3em] text-slate-500">
        <span>{mode === "patient" ? "Patient Intake" : "Provider Dashboard"}</span>
        <div className="flex items-center gap-2">
          {mode === "provider" && (
            <button
              type="button"
              onClick={startNewChat}
              className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-brand/60"
            >
              New Chat
            </button>
          )}
          <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold text-slate-600">
            Live
          </span>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto pr-2 text-sm text-slate-700"
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
              message.role === "user"
                ? "ml-auto bg-brand text-white"
                : "bg-white/80 text-slate-700"
            }`}
          >
            {message.role === "assistant" ? (
              <div className="space-y-2 text-sm leading-relaxed">
                {message.content.split(/\n+/).map((line, lineIndex) => (
                  <p key={`${index}-line-${lineIndex}`} className="whitespace-pre-wrap">
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              message.content
            )}
            {mode === "provider" && index === 0 && message.role === "assistant" && (
              <div className="mt-4 flex flex-wrap gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendPreset(prompt)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-brand/60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="max-w-[70%] rounded-2xl bg-white/70 px-4 py-3 text-slate-500">
            Composing response...
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={2}
          className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand"
        />
        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={isLoading}
          className="rounded-2xl bg-brand px-5 text-sm font-semibold text-white shadow-soft transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Send
        </button>
      </div>
      {mode === "patient" && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-500">
          <span>
            {intakeStatus === "success"
              ? "Intake saved to chart."
              : intakeStatus === "error"
              ? "Intake save failed."
              : "Finish when you are done answering."}
          </span>
          <button
            type="button"
            onClick={() => void finishIntake()}
            disabled={isSubmittingIntake || isLoading}
            className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmittingIntake ? "Processing..." : "Finish Intake"}
          </button>
        </div>
      )}
    </section>
  );
}
