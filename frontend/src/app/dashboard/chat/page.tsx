'use client';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { ChatBubble, TypingIndicator } from '@/components/chat/ChatBubble';
import { TransferConfirmModal } from '@/components/chat/TransferConfirmModal';
import { Send, Sparkles, RotateCcw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  "How much profit did I make this week?",
  "Who are my top customers?",
  "Show today's revenue",
  "Why are sales lower than yesterday?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [pendingTransfer, setPendingTransfer] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text?: string) {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setLoading(true);

    try {
      const result = await api.chat(messageText, conversationId);
      setConversationId(result.conversationId);
      setMessages(prev => [...prev, { role: 'assistant', content: result.message }]);

      if (result.requiresConfirmation) {
        setPendingTransfer(result.requiresConfirmation);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, something went wrong: ${e.message}. Please try again.`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    if (conversationId) {
      await api.clearConversation(conversationId).catch(() => {});
    }
    setMessages([]);
    setConversationId(undefined);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(247,168,37,0.15)' }}>
            <Sparkles size={15} className="text-[#F7A825]" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">Auxo Assistant</h1>
            <p className="text-xs text-slate-500">Ask anything about your business</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white hover:bg-white/5 transition">
            <RotateCcw size={12} /> New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 pulse-glow"
              style={{ background: 'rgba(247,168,37,0.12)' }}>
              <Sparkles size={24} className="text-[#F7A825]" />
            </div>
            <h2 className="text-lg font-semibold mb-1.5">What can I help with?</h2>
            <p className="text-sm text-slate-500 mb-6">
              I can check your revenue, create invoices, send transfers, and explain your business performance.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="px-4 py-3 rounded-xl text-sm text-left text-slate-300 transition hover:bg-white/5"
                  style={{ background: '#12141A', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-5">
            {messages.map((m, i) => (
              <ChatBubble key={i} role={m.role} content={m.content} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 rounded-2xl p-2"
            style={{ background: '#12141A', border: '1px solid rgba(255,255,255,0.08)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about sales, create an invoice, send money…"
              rows={1}
              className="flex-1 bg-transparent outline-none resize-none px-3 py-2.5 text-sm placeholder-slate-500 max-h-32"
              style={{ minHeight: '40px' }}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition disabled:opacity-30"
              style={{ background: '#F7A825' }}>
              <Send size={15} className="text-[#0A0B0F]" />
            </button>
          </div>
          <p className="text-[10px] text-slate-600 text-center mt-2">
            Auxo can make mistakes. Financial transfers always require your confirmation.
          </p>
        </div>
      </div>

      {/* Transfer Confirmation Modal */}
      {pendingTransfer && (
        <TransferConfirmModal
          details={pendingTransfer}
          onClose={() => setPendingTransfer(null)}
          onConfirmed={(result) => {
            setPendingTransfer(null);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `✅ Transfer of ${result.transaction ? '₦' + Number(result.transaction.amount).toLocaleString() : ''} completed successfully. Reference: ${result.transaction?.reference}`,
            }]);
          }}
        />
      )}
    </div>
  );
}
