'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ArrowLeft, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChatInputBar } from '@/components/chat-input-bar';
import { ChatMessages } from '@/components/chat-messages';
import { LongtoneVisualizer } from '@/components/longtone-visualizer';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useAuth } from '@/hooks/use-auth';
import { useMeyda } from '@/hooks/use-meyda';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { getUser, logout } from '@/lib/auth';

const NOTE_NAMES_MAP: Record<string, number> = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
};
function noteToFreq(note: string): number {
    const match = note.match(/^([A-G]#?)(\d)$/);
    if (!match) return 440;
    const semitone = NOTE_NAMES_MAP[match[1]] ?? 9;
    const octave = parseInt(match[2], 10);
    return 440 * Math.pow(2, ((octave + 1) * 12 + semitone - 69) / 12);
}
const TARGET_NOTE_RE = /\{\s*"note"\s*:\s*"([A-Ga-g]#?\d)"\s*,\s*"vowel"\s*:\s*"(\w+)"\s*\}/;
const MILESTONES: Record<number, string> = { 10: '還不錯！🎵', 20: '太神啦！✨' };
const NAV_OPTIONS = [
    { label: '去練音準 🎵', route: '/challenge/pitchmatching' },
    { label: '去練歌曲挑戰 🎤', route: '/challenge/karaoke' },
    { label: '回主畫面 🏠', route: '/' },
];

function ForestBackground() {
    return (
        <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', height: '38vh', pointerEvents: 'none', zIndex: 2 }}>
            <svg viewBox="0 0 420 260" xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMax slice" style={{ width: '100%', height: '100%' }}>
                <polygon points="160,160 182,260 138,260" fill="rgba(80,30,110,0.3)" />
                <polygon points="260,170 285,260 235,260" fill="rgba(75,25,105,0.3)" />
                <polygon points="65,110  95,260  35,260"  fill="rgba(55,15,90,0.55)" />
                <polygon points="210,100 248,260 172,260" fill="rgba(50,12,85,0.5)" />
                <polygon points="355,115 388,260 322,260" fill="rgba(55,15,90,0.55)" />
                <polygon points="-15,5   32,260 -62,260"  fill="rgba(22,6,42,0.92)" />
                <polygon points="42,-10  88,260  -4,260"  fill="rgba(18,4,36,0.95)" />
                <polygon points="115,25 155,260  75,260"  fill="rgba(22,6,42,0.85)" />
                <polygon points="305,35 345,260 265,260"  fill="rgba(22,6,42,0.85)" />
                <polygon points="370,-5 415,260 325,260"  fill="rgba(18,4,36,0.95)" />
                <polygon points="432,10 475,260 389,260"  fill="rgba(22,6,42,0.92)" />
                <polygon points="42,25  65,82   19,82"   fill="rgba(18,4,36,0.95)" />
                <polygon points="370,30 393,88  347,88"  fill="rgba(18,4,36,0.95)" />
                <polygon points="115,70 138,128  92,128" fill="rgba(22,6,42,0.85)" />
                <polygon points="305,80 328,135 282,135" fill="rgba(22,6,42,0.85)" />
            </svg>
        </div>
    );
}

export default function LongToneChallenge() {
    const user = useAuth();
    const router = useRouter();
    const [input, setInput] = useState('');
    const [milestone, setMilestone] = useState<string | null>(null);
    const milestoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { messages, sendMessage, setMessages, status } = useChat({
        transport: new DefaultChatTransport({
            body: () => ({ userId: user?.userId ?? getUser()?.userId, challengeId: 'longtone' }),
        }),
    });
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const isLoading = !!uploadProgress || status === 'submitted' || status === 'streaming';

    const hasInitialized = useRef(false);
    useEffect(() => {
        if (!hasInitialized.current && user) {
            hasInitialized.current = true;
            sendMessage({ role: 'user', parts: [{ type: 'text', text: '開始' }] as any });
        }
    }, [user]); // eslint-disable-line

    // ⑤ 錄音送出後設旗標
    const [audioSubmitted, setAudioSubmitted] = useState(false);
    const showNavButtons = audioSubmitted && !isLoading;

    const targetInfo = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            if (m.role !== 'assistant' || !Array.isArray(m.parts)) continue;
            for (const p of m.parts) {
                if ((p as any).type === 'text' && typeof (p as any).text === 'string') {
                    const match = (p as any).text.match(TARGET_NOTE_RE);
                    if (match) return { note: match[1], vowel: match[2] };
                }
            }
        }
        return null;
    }, [messages]);

    const targetFreq = targetInfo ? noteToFreq(targetInfo.note) : null;
    const recordingUnlocked = targetInfo !== null;

    const { isListening, stop: stopListening, toggle: toggleListening } = useSpeechToText(
        useCallback((transcript: string) => setInput(transcript), []),
    );
    const { features, rmsHistory, attach: attachMeyda, detach: detachMeyda } = useMeyda(targetFreq);
    const { isRecording, recordingTime, audioAttachment, startRecording, stopRecording, clearAttachment } = useAudioRecorder({
        onWorkletReady: attachMeyda, onRecordingStop: detachMeyda,
    });

    useEffect(() => {
        if (!isRecording) { setMilestone(null); return; }
        const msg = MILESTONES[recordingTime];
        if (msg) {
            setMilestone(msg);
            if (milestoneTimer.current) clearTimeout(milestoneTimer.current);
            milestoneTimer.current = setTimeout(() => setMilestone(null), 2500);
        }
    }, [isRecording, recordingTime]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isLoading) return;
        if (!input.trim() && !audioAttachment) return;
        const currentInput = input; const currentAudio = audioAttachment;
        resetInput(); if (currentAudio) clearAttachment();
        const parts: Array<{ type: string; text?: string; mediaType?: string; url?: string }> = [];
        if (currentInput.trim()) parts.push({ type: 'text', text: currentInput });
        if (currentAudio) {
            const optimisticParts: typeof parts = [...parts];
            if (!optimisticParts.some((p) => p.type === 'text' && p.text?.trim())) optimisticParts.unshift({ type: 'text', text: '🎤 Audio recording' });
            const optimisticId = `optimistic-${Date.now()}`;
            setMessages((prev) => [...prev, { id: optimisticId, role: 'user', parts: optimisticParts } as any]);
            setUploadProgress('Uploading audio…');
            const formData = new FormData();
            formData.append('file', currentAudio.blob, 'recording.wav');
            if (user?.userId) formData.append('userId', user.userId);
            try {
                const res = await fetch('/api/upload-audio', { method: 'POST', body: formData });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error);
                parts.push({ type: 'file', mediaType: 'audio/wav', url: json.data.url });
            } catch (err) {
                console.error('Audio upload failed:', err); alert('Audio upload failed. Please try again.');
                setMessages((prev) => prev.filter((m) => m.id !== optimisticId)); setUploadProgress(null); return;
            }
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            setUploadProgress('Analyzing audio…');
            if (!parts.some((p) => p.type === 'text' && p.text?.trim())) parts.unshift({ type: 'text', text: '這是我的錄音，請幫我分析！' });
        }
        sendMessage({ role: 'user', parts: parts as any });
        setUploadProgress(null);
        if (currentAudio) setAudioSubmitted(true); // ⑤ 設旗標
    };

    const resetInput = () => { setInput(''); if (isListening) stopListening(); };
    if (!user) return null;

    const displayMessages = messages.filter((m, i) => !(i === 0 && m.role === 'user'));
    const progressPct = Math.min((recordingTime / 20) * 100, 100);

    return (
        <>
            <ForestBackground />

            <main className="flex flex-col items-center justify-between min-h-screen text-white p-5 overflow-x-hidden relative"
                style={{ backgroundColor: '#0D0A14' }}>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
                    style={{ zIndex: 0, background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)' }} />

                <div className="relative flex flex-col items-center space-y-5 text-center max-w-3xl w-full flex-1 min-h-0 pt-4" style={{ zIndex: 10 }}>
                    <header className="space-y-1 shrink-0 relative w-full pt-10">
                        <Link href="/" className="absolute left-0 top-0 flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs"
                            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(240,235,248,0.5)' }}>
                            <ArrowLeft className="w-3.5 h-3.5" /> 返回首頁
                        </Link>
                        {user && (
                            <button onClick={logout} className="absolute right-0 top-0 flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs"
                                style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(240,235,248,0.5)' }}>
                                <LogOut className="w-3.5 h-3.5" /> 登出
                            </button>
                        )}
                        <p className="text-xs font-medium" style={{ color: 'rgba(255,45,122,0.7)' }}>第二關 · 氣息控制挑戰</p>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight"
                            style={{ background: 'linear-gradient(135deg, #8B5CF6, #FF2D7A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            一口氣到底
                        </h1>
                        <p className="text-xs" style={{ color: 'rgba(240,235,248,0.4)' }}>穩定、持久地唱出目標音！</p>
                    </header>

                    <div className="flex-1 min-h-0 w-full overflow-y-auto p-4 text-left font-medium">
                        <ChatMessages messages={displayMessages as any} isLoading={isLoading} uploadProgress={uploadProgress} />
                    </div>
                </div>

                <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
                    {isRecording && (
                        <div className="relative w-full max-w-md mx-auto shrink-0 px-5 mb-2">
                            {milestone && (
                                <div className="absolute -top-9 left-1/2 px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap z-20"
                                    style={{ background: '#FFD93D', color: '#0D0A14', transform: 'translateX(-50%)' }}>
                                    {milestone}
                                </div>
                            )}
                            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <div className="h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${progressPct}%`, background: progressPct >= 100 ? 'linear-gradient(90deg, #8B5CF6, #FFD93D)' : 'linear-gradient(90deg, #FF2D7A, #8B5CF6)' }} />
                            </div>
                            <div className="flex justify-between text-xs mt-1.5" style={{ color: 'rgba(240,235,248,0.35)' }}>
                                <span>0s</span><span>10s</span><span>20s</span>
                            </div>
                        </div>
                    )}

                    <LongtoneVisualizer features={features} rmsHistory={rmsHistory} isRecording={isRecording} recordingTime={recordingTime} targetNote={targetInfo?.note ?? null} />

                    {showNavButtons && (
                        <div className="w-full max-w-md mx-auto px-4 pb-2">
                            <p className="text-xs text-center mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>接下來要去哪裡？</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {NAV_OPTIONS.map((opt) => (
                                    <button key={opt.route} onClick={() => router.push(opt.route)}
                                        className="px-4 py-2 rounded-2xl text-sm font-medium transition-all"
                                        style={{ background: opt.route === '/' ? 'rgba(139,92,246,0.15)' : 'rgba(255,45,122,0.15)', border: opt.route === '/' ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,45,122,0.4)', color: opt.route === '/' ? '#8B5CF6' : '#FF2D7A' }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <ChatInputBar
                        input={input} onInputChange={setInput} onSubmit={handleSubmit} isLoading={isLoading}
                        isListening={isListening} onToggleListening={toggleListening}
                        isRecording={isRecording} recordingTime={recordingTime} audioAttachment={audioAttachment}
                        onStartRecording={startRecording} onStopRecording={stopRecording} onClearAttachment={clearAttachment}
                        recordingUnlocked={recordingUnlocked}
                    />
                </div>
            </main>
        </>
    );
}
