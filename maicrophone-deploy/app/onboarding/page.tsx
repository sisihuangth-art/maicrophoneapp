'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { getUser } from '@/lib/auth';

const ROUTE_RE = /\{"route":\s*"(pitchmatching|longtone|karaoke)"\}/;

const QUICK_REPLIES = [
    { label: '🎵 音準', value: '音準' },
    { label: '🌊 氣息', value: '氣息' },
    { label: '💫 情感', value: '情感' },
];

export default function OnboardingPage() {
    const user = useAuth();
    const router = useRouter();
    const [input, setInput] = useState('');
    const hasInitialized = useRef(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [redirecting, setRedirecting] = useState(false);

    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({
            body: () => ({ userId: user?.userId ?? getUser()?.userId, challengeId: 'onboarding' }),
        }),
    });

    const isLoading = status === 'submitted' || status === 'streaming';

    // Trigger AI to speak first
    useEffect(() => {
        if (!hasInitialized.current && user) {
            hasInitialized.current = true;
            sendMessage({ role: 'user', parts: [{ type: 'text', text: '開始' }] as any });
        }
    }, [user, sendMessage]);

    // Detect route JSON from AI
    useEffect(() => {
        if (redirecting) return;
        for (const msg of messages) {
            if (msg.role !== 'assistant' || !Array.isArray(msg.parts)) continue;
            for (const p of msg.parts as any[]) {
                if (p.type === 'text' && typeof p.text === 'string') {
                    const match = p.text.match(ROUTE_RE);
                    if (match) {
                        setRedirecting(true);
                        setTimeout(() => router.push(`/challenge/${match[1]}`), 1400);
                        return;
                    }
                }
            }
        }
    }, [messages, redirecting, router]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const { isListening, toggle: toggleListening } = useSpeechToText(
        useCallback((transcript: string) => setInput(transcript), []),
    );

    const handleSend = (text?: string) => {
        const content = text || input.trim();
        if (!content || isLoading) return;
        setInput('');
        sendMessage({ role: 'user', parts: [{ type: 'text', text: content }] as any });
    };

    // Display messages: hide first user message (the trigger "開始")
    const displayMessages = messages.filter((m, i) => !(i === 0 && m.role === 'user'));
    const userMessageCount = messages.filter(m => m.role === 'user').length;
    const showQuickReplies = userMessageCount <= 1 && !redirecting;

    if (!user) return null;

    return (
        <div className="flex flex-col min-h-screen text-white" style={{ backgroundColor: '#0D0A14' }}>
            {/* Background glows */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(255,45,122,0.1) 0%, transparent 70%)' }} />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-center p-5 pt-8">
                <div className="text-center">
                    <h1
                        className="text-2xl font-extrabold"
                        style={{
                            fontFamily: "'Bricolage Grotesque', sans-serif",
                            background: 'linear-gradient(135deg, #FF2D7A, #8B5CF6)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Maicrophone
                    </h1>
                    <p className="text-xs mt-1" style={{ color: 'rgba(240,235,248,0.4)' }}>歌唱力養成森林</p>
                </div>
            </header>

            {/* Messages */}
            <div className="relative z-10 flex-1 overflow-y-auto px-5 py-4 max-w-lg mx-auto w-full">
                {displayMessages.length === 0 && (
                    <div className="flex items-center gap-2 mt-8" style={{ color: 'rgba(240,235,248,0.4)' }}>
                        <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                                    style={{ backgroundColor: '#8B5CF6', animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                        <span className="text-sm">Maicrophone 正在思考...</span>
                    </div>
                )}

                {displayMessages.map((msg, i) => {
                    // Strip route JSON from display
                    const rawText = Array.isArray(msg.parts)
                        ? (msg.parts as any[]).filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
                        : '';
                    const cleanText = rawText.replace(ROUTE_RE, '').trim();
                    if (!cleanText) return null;

                    return (
                        <div key={msg.id} className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'assistant' && (
                                <div className="mr-2 flex-shrink-0 mt-1">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{ background: 'linear-gradient(135deg, #FF2D7A, #8B5CF6)' }}>
                                        M
                                    </div>
                                </div>
                            )}
                            <div
                                className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                                style={msg.role === 'assistant'
                                    ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderTopLeftRadius: 4 }
                                    : { background: 'linear-gradient(135deg, rgba(255,45,122,0.25), rgba(139,92,246,0.25))', border: '1px solid rgba(255,45,122,0.3)', borderTopRightRadius: 4 }
                                }
                            >
                                {cleanText}
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="flex justify-start mb-4">
                        <div className="mr-2 flex-shrink-0">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                                style={{ background: 'linear-gradient(135deg, #FF2D7A, #8B5CF6)' }}>
                                M
                            </div>
                        </div>
                        <div className="rounded-2xl px-4 py-3 flex gap-1.5 items-center"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                                    style={{ backgroundColor: '#8B5CF6', animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </div>
                )}

                {redirecting && (
                    <div className="text-center mt-4 text-sm font-medium" style={{ color: '#FFD93D' }}>
                        ✨ 前往關卡中...
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Quick replies + Input */}
            <div className="relative z-10 px-5 pb-8 max-w-lg mx-auto w-full">
                {showQuickReplies && !isLoading && (
                    <div className="flex gap-2 mb-3 justify-center flex-wrap">
                        {QUICK_REPLIES.map((r) => (
                            <button
                                key={r.value}
                                onClick={() => handleSend(r.value)}
                                className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105"
                                style={{
                                    background: 'rgba(139,92,246,0.15)',
                                    border: '1px solid rgba(139,92,246,0.4)',
                                    color: '#8B5CF6',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(139,92,246,0.3)';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(139,92,246,0.15)';
                                    e.currentTarget.style.color = '#8B5CF6';
                                }}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex gap-2 items-center rounded-full px-4 py-2"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                        onClick={() => toggleListening()}
                        className="p-2 rounded-full flex-shrink-0 transition"
                        style={isListening
                            ? { background: 'rgba(6,214,160,0.2)', color: '#06D6A0' }
                            : { color: 'rgba(240,235,248,0.4)' }}
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
                        </svg>
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={isListening ? '聆聽中...' : '或直接輸入...'}
                        disabled={isLoading}
                        className="flex-1 bg-transparent text-sm outline-none"
                        style={{ color: 'white' }}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={isLoading || !input.trim()}
                        className="p-2 rounded-full flex-shrink-0 transition disabled:opacity-30"
                        style={{ background: 'linear-gradient(135deg, #FF2D7A, #8B5CF6)' }}
                    >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
