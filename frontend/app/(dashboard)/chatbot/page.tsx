"use client";

import { useState, useRef, useEffect } from "react";
import { chatApi } from "@/lib/api";
import type { ChatMessage } from "@/types";
import {
  Send, Loader2, Bot, User, ChevronDown, Code2, Database, MessageSquareText, Cpu, Globe, Zap, Sparkles
} from "lucide-react";

const SUGGESTIONS = [
  "CS Major က Attendance ၇၅% အောက် ကျောင်းသားများ ဘယ်သူတွေလဲ?",
  "Show all teachers in the Computer Science department",
  "How many students have enrolled their face?",
  "What is the attendance policy?",
  "List students enrolled this year sorted by name",
];

interface ModelOption {
  provider: string;
  id: string;
  name: string;
  is_free?: boolean;
}

interface ModelsInfo {
  groq_available: boolean;
  openrouter_available: boolean;
  default_provider: string;
  models: ModelOption[];
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [showSql, setShowSql] = useState(false);
  const isUser = msg.role === "user";

  return (
    <div className={`chat-message flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
        ${isUser
          ? "bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md shadow-violet-900/30"
          : "bg-theme-elevated border border-theme-border-hover"}`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-violet-400" />}
      </div>

      {/* Content */}
      <div className={`max-w-[75%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? "bg-violet-600 text-white rounded-tr-sm"
            : "bg-theme-elevated border border-theme-border-hover/60 text-theme-text rounded-tl-sm"}`}>
          {msg.content}
        </div>

        {/* SQL query toggle (assistant only) */}
        {!isUser && msg.sql_query && (
          <div className="w-full">
            <button
              onClick={() => setShowSql((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-theme-muted hover:text-theme-sub transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showSql ? "Hide" : "Show"} SQL Query
              <ChevronDown className={`w-3 h-3 transition-transform ${showSql ? "rotate-180" : ""}`} />
            </button>
            {showSql && (
              <pre className="mt-2 p-3 bg-theme-base border border-theme-border rounded-lg text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                {msg.sql_query}
              </pre>
            )}
          </div>
        )}

        {/* Raw data count */}
        {!isUser && msg.raw_data && msg.raw_data.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-theme-muted">
            <Database className="w-3.5 h-3.5" />
            {msg.raw_data.length} row{msg.raw_data.length !== 1 ? "s" : ""} returned
          </div>
        )}

        <span className="text-xs text-slate-600">
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "👋 Hello! I'm the SUIS AI Assistant. I can answer questions about students, teachers, attendance records, and university information. Select your preferred AI Model above and ask me anything!",
      timestamp: new Date(),
      query_type: "general_info",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [modelsInfo, setModelsInfo] = useState<ModelsInfo | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>("llama-3.3-70b-versatile");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatApi.getModels().then((data) => {
      setModelsInfo(data);
      if (data.models.length > 0) {
        // default to first groq if groq available, else first openrouter
        const defaultModel = data.models.find((m) => m.provider === data.default_provider) ?? data.models[0];
        if (defaultModel) setSelectedModelId(defaultModel.id);
      }
    }).catch(() => { });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeModelObj = modelsInfo?.models.find((m) => m.id === selectedModelId);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await chatApi.send(
        text,
        activeModelObj?.provider,
        activeModelObj?.id
      );
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: res.answer,
        sql_query: res.sql_query,
        raw_data: res.raw_data,
        query_type: res.query_type,
        timestamp: new Date(),
      };
      setMessages((m) => [...m, assistantMsg]);
    } catch (e: unknown) {
      setMessages((m) => [...m, {
        role: "assistant",
        content: `Sorry, I encountered an error: ${(e as Error).message}`,
        timestamp: new Date(),
        query_type: "error",
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-h-[800px]">
      {/* Page header with Model Selector */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
            <MessageSquareText className="w-5 h-5 text-theme-text" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
              AI Chatbot
              {activeModelObj?.provider === "openrouter" ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold flex items-center gap-1">
                  <Globe className="w-3 h-3 text-cyan-400" /> OpenRouter API
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800 font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Groq High-Speed LLM
                </span>
              )}
            </h2>
            <p className="text-xs text-theme-sub">Smart Assistant & University Intelligence</p>
          </div>
        </div>

        {/* AI Model dropdown */}
        <div className="flex items-center gap-2 bg-theme-surface border border-theme-border p-1.5 rounded-xl shadow-md">
          <Cpu className="w-4 h-4 text-amber-400 ml-1.5 shrink-0" />
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="bg-theme-elevated border border-theme-border-hover text-xs font-medium text-theme-text rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
          >
            {modelsInfo?.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-theme-surface border border-theme-border rounded-xl p-4 space-y-5">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {loading && (
          <div className="chat-message flex gap-3">
            <div className="w-8 h-8 rounded-full bg-theme-elevated border border-theme-border-hover flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-violet-400 animate-pulse" />
            </div>
            <div className="bg-theme-elevated border border-theme-border-hover/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              <span className="text-sm text-theme-sub">
                Thinking with <span className="text-amber-400 font-semibold">{activeModelObj?.name ?? "AI"}</span>…
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-theme-elevated border border-theme-border-hover text-theme-sub hover:border-violet-600/50 hover:text-violet-300 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="mt-3 flex gap-3">
        <div className="flex-1 bg-theme-surface border border-theme-border-hover rounded-xl p-3 focus-within:ring-2 focus-within:ring-violet-600/50 transition-shadow">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about students, attendance, university info… (Enter to send)"
            rows={2}
            className="w-full bg-transparent text-sm text-theme-text placeholder:text-theme-muted resize-none focus:outline-none"
          />
        </div>
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 flex items-center justify-center shadow-lg shadow-violet-900/30"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
