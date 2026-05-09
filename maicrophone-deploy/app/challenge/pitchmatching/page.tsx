'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ArrowLeft, LogOut, Music } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { ChatInputBar } from '@/components/chat-input-bar';
import { ChatMessages } from '@/components/chat-messages';
import { PitchVisualizer } from '@/components/pitch-visualizer';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useAuth } from '@/hooks/use-auth';
import { usePitchDetection } from '@/hooks/use-pitch-detection';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { getUser, logout } from '@/lib/auth';

export default function DoReMiChallenge() {
    const user = useAuth();

    const [input, setInput] = useState('');

    const { messages, sendMessage, setMessages, status } = useChat({
        transport: new DefaultChatTransport({
            body: () => ({ userId: user?.userId ?? getUser()?.userId, challengeId: 'pitchmatching' }),
        }),
    });
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const isLoading = !!uploadProgress || status === 'submitted' || status === 'streaming';

    // ─── Extract latest target notes from AI messages ───
    const NOTE_ARRAY_RE = /\[\s*"[A-Ga-g][#b]?\d"(?:\s*,\s*"[A-Ga-g][#b]?\d")*\s*\]/;
    const targetNotes = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m.role !== 'assistant' || !Array.isArray(m.parts)) continue;
            for (const p of m.parts) {
                if ((p as any).type === 'text' && typeof (p as any).text === 'string') {
                    const match = (p as any).text.match(NOTE_ARRAY_RE);
                    if (match) {
                        try { return JSON.parse(match[0]) as string[]; } catch { /* ignore */ }
                    }
                }
            }
        }
        return [] as string[];
    }, [messages]);

    // ─── Hooks ───
    const { isListening, stop: stopListening, toggle: toggleListening } = useSpeechToText(
        useCallback((transcript: string) => setInput(transcript), []),
    );

    const { pitch, attach, detach } = usePitchDetection();

    const {
        isRecording,
        recordingTime,
        audioAttachment,
        startRecording,
        stopRecording,
        clearAttachment,
    } = useAudioRecorder({
        onWorkletReady: attach,
        onRecordingStop: detach,
    });

    // ─── Submit handler ───
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isLoading) return;
        if (!input.trim() && !audioAttachment) return;

        const currentInput = input;
        const currentAudio = audioAttachment;

        resetInput();
        if (currentAudio) clearAttachment();

        const parts: Array<{ type: string; text?: string; mediaType?: string; url?: string }> = [];
        if (currentInput.trim()) parts.push({ type: 'text', text: currentInput });

        if (currentAudio) {
            const optimisticParts: typeof parts = [...parts];
            if (!optimisticParts.some((p) => p.type === 'text' && p.text?.trim())) {
                optimisticParts.unshift({ type: 'text', text: '🎤 Audio recording' });
            }
            const optimisticId = `optimistic-${Date.now()}`;
            setMessages((prev) => [
                ...prev,
                { id: optimisticId, role: 'user', parts: optimisticParts } as any,
            ]);

            setUploadProgress('Uploading audio…');
            const formData = new FormData();
            formData.append('file', currentAudio.blob, 'recording.wav');
            if (user?.userId) {
                formData.append('userId', user.userId);
            }

            try {
                const res = await fetch('/api/upload-audio', { method: 'POST', body: formData });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error);

                parts.push({ type: 'file', mediaType: 'audio/wav', url: json.data.url });
            } catch (err) {
                console.error('Audio upload failed:', err);
                alert('Audio upload failed. Please try again.');
                setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
                setUploadProgress(null);
                return;
            }

            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            setUploadProgress('Analyzing audio…');

            if (!parts.some((p) => p.type === 'text' && p.text?.trim())) {
                parts.unshift({ type: 'text', text: '這是我的錄音，請幫我分析！' });
            }
        }
        sendMessage({ role: 'user', parts: parts as any });
        setUploadProgress(null);
    };

    const resetInput = () => {
        setInput('');
        if (isListening) stopListening();
    };

    if (!user) return null;

    return (
        <main className="flex flex-col items-center justify-between min-h-screen bg-zinc-950 text-white font-sans p-6 overflow-hidden relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center space-y-6 text-center max-w-3xl w-full flex-1 min-h-0 pt-4">
                {/* Header */}
                <header className="space-y-4 shrink-0 relative w-full">
                    <Link
                        href="/"
                        className="absolute left-0 top-0 flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        返回首頁
                    </Link>
                    {user && (
                        <button
                            onClick={logout}
                            className="absolute right-0 top-0 flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            登出
                        </button>
                    )}
                    <div className="inline-flex items-center justify-center p-3 bg-zinc-900 border border-zinc-800 rounded-2xl mb-2 shadow-xl">
                        <Music className="w-8 h-8 text-pink-400" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-pink-300 to-rose-500 bg-clip-text text-transparent pb-2">
                        魔法少女 Do Re Mi
                    </h1>
                    <p className="text-base text-zinc-400 font-medium">音準挑戰 — 跟著唱出正確的音符！</p>
                </header>

                {/* Messages */}
                <div className="flex-1 min-h-0 w-full overflow-y-auto space-y-4 p-4 text-left font-medium">
                    <ChatMessages messages={messages as any} isLoading={isLoading} uploadProgress={uploadProgress} />
                </div>
            </div>

            {/* Pitch visualizer (real-time, only during recording) */}
            <PitchVisualizer pitch={pitch} isRecording={isRecording} targetNotes={targetNotes} />

            {/* Input bar */}
            <ChatInputBar
                input={input}
                onInputChange={setInput}
                onSubmit={handleSubmit}
                isLoading={isLoading}
                isListening={isListening}
                onToggleListening={toggleListening}
                isRecording={isRecording}
                recordingTime={recordingTime}
                audioAttachment={audioAttachment}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onClearAttachment={clearAttachment}
            />
        </main>
    );
}
