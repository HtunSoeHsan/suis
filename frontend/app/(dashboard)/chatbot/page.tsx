"use client";

import { useState, useRef, useEffect } from "react";
import { chatApi } from "@/lib/api";
import type { ChatMessage } from "@/types";
import {
  Send, Loader2, Bot, User, ChevronDown, Code2, Database, MessageSquareText,
} from "lucide-react";

const SUGGESTIONS = [
  "CS Major က Attendance ၇၅% အောက် ကျောင်းသားများ ဘယ်သူတွေလဲ?",
  "Show all teachers in the Computer Science department",
  "How many students have enrolled their face?",
  "What is the attendance policy?",
  "List students enrolled this year sorted by name",
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [showSql, setShowSql] = useState(false);
  const isUser = msg.role === "user";

  return (
    <div className={`chat-message flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
        ${isUser
          ? "bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md shadow-violet-900/30"
          : "bg-slate-800 border border-slate-700"}`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-violet-400" />}
      </div>

      {/* Content */}
      <div className={`max-w-[75%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? "bg-violet-600 text-white rounded-tr-sm"
            : "bg-slate-800 border border-slate-700/60 text-slate-200 rounded-tl-sm"}`}>
          {msg.content}
        </div>

        {/* SQL query toggle (assistant only) */}
        {!isUser && msg.sql_query && (
          <div className="w-full">
            <button
              onClick={() => setShowSql((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showSql ? "Hide" : "Show"} SQL Query
              <ChevronDown className={`w-3 h-3 transition-transform ${showSql ? "rotate-180" : ""}`} />
            </button>
            {showSql && (
              <pre className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                {msg.sql_query}
              </pre>
            )}
          </div>
        )}

        {/* Raw data count */}
        {!isUser && msg.raw_data && msg.raw_data.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
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
      content: "👋 Hello! I'm the SUIS AI Assistant. I can answer questions about students, teachers, attendance records, and university information. Try asking me anything!",
      timestamp: new Date(),
      query_type: "general_info",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await chatApi.send(text);
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
      {/* Page header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-900/30">
          <MessageSquareText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">AI Chatbot</h2>
          <p className="text-xs text-slate-400">Powered by Groq Llama 3.3 70B · Text-to-SQL</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-5">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {loading && (
          <div className="chat-message flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-violet-400" />
            </div>
            <div className="bg-slate-800 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
              <span className="text-sm text-slate-400">Thinking…</span>
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
              className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:border-violet-600/50 hover:text-violet-300 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="mt-3 flex gap-3">
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 focus-within:ring-2 focus-within:ring-violet-600/50 transition-shadow">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about students, attendance, university info… (Enter to send)"
            rows={2}
            className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 resize-none focus:outline-none"
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
