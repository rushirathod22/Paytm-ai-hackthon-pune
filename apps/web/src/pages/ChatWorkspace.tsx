import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  FileText,
  Building2,
  ChevronRight
} from 'lucide-react';
import { opsApi } from '../services/api';
import { ChatMessage } from '../types';
import { EvidenceCard } from '../components/EvidenceCard';
import { VoiceSession } from '../components/VoiceSession';

interface ChatWorkspaceProps {
  initialQuery?: string;
  onViewCase: (caseId: string) => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({ initialQuery, onViewCase }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ASSISTANT',
      content:
        'Namaste! I am OpsSaathi AI, your autonomous merchant operations teammate. I investigate missing payments, calculate settlement discrepancies using verified Decimal arithmetic, and coordinate with human supervisors. How can I assist you?',
    },
  ]);
  const [input, setInput] = useState(initialQuery || '');
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sentInitialQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialQuery && sentInitialQueryRef.current !== initialQuery) {
      sentInitialQueryRef.current = initialQuery;
      sendMessage(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'USER',
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await opsApi.sendMessage(trimmed, conversationId, 'CHAT');
      if (res.ok) {
        setConversationId(res.data.conversation_id);
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'ASSISTANT',
          content: res.data.message,
          evidence: res.data.evidence,
          case: res.data.case,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'ASSISTANT',
          content: `Unable to complete investigation: ${res.error?.message || 'Backend service unavailable'}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'ASSISTANT',
        content: `Connection error: ${err.message || 'Failed to reach OpsSaathi API'}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceTranscription = (data: any) => {
    setConversationId(data.conversation_id);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'USER',
      content: data.user_message || 'Voice input received',
    };
    const botMsg: ChatMessage = {
      id: `bot-${Date.now()}`,
      role: 'ASSISTANT',
      content: data.message,
      evidence: data.evidence,
      case: data.case,
    };
    setMessages((prev) => [...prev, userMsg, botMsg]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Voice Assistant Module */}
      <VoiceSession
        conversationId={conversationId}
        onTranscriptionSubmitted={handleVoiceTranscription}
        isLoading={isLoading}
      />

      {/* Main Conversation Window */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-paytm overflow-hidden flex flex-col h-[580px]">
        {/* Chat Header styled like Paytm */}
        <div className="bg-[#F8FAFC] border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#002970] flex items-center justify-center text-white shadow-xs">
              <Bot className="w-5 h-5 text-[#00BAF2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-[#002970]">OpsSaathi Operations Teammate</span>
                <span className="bg-[#E8F8FE] text-[#002970] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#00BAF2]/30">
                  LangGraph Agent
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Sharma Sweets & Chaat • Scoped Tenant: PAYTM_STAGE_MID_8819
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold text-slate-700">Online</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F4F7FB]">
          {messages.map((m) => {
            const isUser = m.role === 'USER';
            return (
              <div
                key={m.id}
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                    isUser
                      ? 'bg-[#002970] text-white'
                      : 'bg-[#00BAF2] text-[#002970]'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                </div>

                <div className={`max-w-[85%] ${isUser ? 'text-right' : 'text-left'}`}>
                  <div
                    className={`inline-block p-4 sm:p-5 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-[#002970] text-white rounded-tr-none font-medium'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>

                    {/* Evidence Card */}
                    {m.evidence && <EvidenceCard evidence={m.evidence} />}

                    {/* Support Case Banner */}
                    {m.case && (
                      <div className="mt-4 bg-[#002970] text-white p-4 rounded-2xl border border-sky-800 text-left flex items-center justify-between shadow-sm">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-[#00BAF2] font-mono">
                              {m.case.case_number}
                            </span>
                            <span className="bg-amber-400/20 text-amber-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-amber-400/30 font-bold">
                              {m.case.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-sky-100 mt-1">
                            Assigned: {m.case.queue} • Priority: {m.case.priority}
                          </p>
                        </div>

                        <button
                          onClick={() => onViewCase(m.case.id)}
                          className="bg-[#00BAF2] hover:bg-sky-400 text-[#002970] px-3.5 py-2 rounded-full text-xs font-bold flex items-center space-x-1 shrink-0 ml-3 transition-colors"
                        >
                          <span>Review Case</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Investigating spinner */}
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-[#00BAF2] flex items-center justify-center text-[#002970] shrink-0">
                <Bot className="w-5 h-5 animate-spin" />
              </div>
              <div className="bg-white border border-slate-200/80 p-4 rounded-3xl rounded-tl-none shadow-xs flex items-center space-x-2 text-xs text-slate-700 font-medium">
                <RefreshCw className="w-4 h-4 text-[#00BAF2] animate-spin" />
                <span>
                  OpsSaathi investigating: Running backend Decimal reconciliation & checking Paytm Staging records...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask OpsSaathi: Type order number, settlement amount, or discrepancy..."
              className="flex-1 bg-[#F4F7FB] border border-slate-200 rounded-full px-5 py-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#00BAF2] font-medium"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[#002970] hover:bg-[#001d52] disabled:opacity-50 text-white px-6 py-3 rounded-full text-xs sm:text-sm font-bold flex items-center space-x-1.5 shrink-0 transition-colors shadow-sm"
            >
              <span>Investigate</span>
              <Send className="w-4 h-4 text-[#00BAF2]" />
            </button>
          </form>

          {/* Quick Click Prompts */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-slate-500">
            <span className="font-bold text-[#002970]">Quick Test Scenarios:</span>
            <button
              onClick={() =>
                sendMessage(
                  'My ₹6,000 payment for Order #ORD-8821 is missing from today\'s settlement batch.'
                )
              }
              className="bg-[#E8F8FE] hover:bg-[#d5f1fd] text-[#002970] font-semibold px-3 py-1 rounded-full border border-[#00BAF2]/30 transition-colors"
            >
              Missing ₹6,000 (ORD-8821)
            </button>
            <button
              onClick={() => sendMessage('Check status for Order #ORD-8819 and settlement batch.')}
              className="bg-[#F4F7FB] hover:bg-slate-200/70 text-slate-700 font-medium px-3 py-1 rounded-full border border-slate-200 transition-colors"
            >
              Check ORD-8819 (₹5,000)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
