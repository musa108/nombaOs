'use client';
import { Bot, User } from 'lucide-react';

export function ChatBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <div className={`flex gap-3 fade-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: isUser ? 'rgba(255,255,255,0.08)' : 'rgba(247,168,37,0.15)',
        }}>
        {isUser ? <User size={13} className="text-slate-400" /> : <Bot size={13} className="text-[#F7A825]" />}
      </div>
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
        style={{
          background: isUser ? '#F7A825' : '#1A1D27',
          color: isUser ? '#0A0B0F' : '#E8E9ED',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.06)',
        }}>
        {content}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(247,168,37,0.15)' }}>
        <Bot size={13} className="text-[#F7A825]" />
      </div>
      <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm flex items-center gap-1"
        style={{ background: '#1A1D27', border: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 typing-dot" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 typing-dot" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 typing-dot" />
      </div>
    </div>
  );
}
