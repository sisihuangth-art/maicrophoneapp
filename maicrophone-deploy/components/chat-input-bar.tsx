import type { AudioAttachment } from '@/hooks/use-audio-recorder';
import { FileAudio, Mic, MicOff, Send, Square, X } from 'lucide-react';

interface ChatInputBarProps {
    input: string;
    onInputChange: (value: string) => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
    isListening: boolean;
    onToggleListening: () => void;
    isRecording: boolean;
    recordingTime: number;
    audioAttachment: AudioAttachment | null;
    onStartRecording: () => void;
    onStopRecording: () => void;
    onClearAttachment: () => void;
    recordingUnlocked?: boolean;
}

function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export function ChatInputBar({
    input, onInputChange, onSubmit, isLoading,
    isListening, onToggleListening,
    isRecording, recordingTime, audioAttachment,
    onStartRecording, onStopRecording, onClearAttachment,
    recordingUnlocked = true,
}: ChatInputBarProps) {

    const canRecord = recordingUnlocked && !isLoading;

    return (
        <div className="relative z-10 w-full max-w-3xl shrink-0 pb-4 space-y-2">
            {/* Unlocked hint */}
            {recordingUnlocked && !isRecording && !audioAttachment && (
                <div className="flex justify-center">
                    <span className="text-xs font-medium px-3 py-1 rounded-full animate-pulse"
                        style={{ background: 'rgba(255,45,122,0.15)', color: '#FF2D7A', border: '1px solid rgba(255,45,122,0.3)' }}>
                        🎤 可以開始錄音了！
                    </span>
                </div>
            )}

            {/* Audio attachment */}
            {audioAttachment && (
                <div className="flex items-center gap-3 rounded-2xl px-4 py-2 mx-2"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <FileAudio className="w-5 h-5 flex-shrink-0" style={{ color: '#8B5CF6' }} />
                    <audio src={audioAttachment.url} controls className="h-8 flex-1" />
                    <span className="text-xs flex-shrink-0" style={{ color: 'rgba(240,235,248,0.4)' }}>.wav</span>
                    <button type="button" onClick={onClearAttachment}
                        className="p-1 rounded-full transition"
                        style={{ color: 'rgba(240,235,248,0.4)' }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
                <div className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: '#FF2D7A' }}>
                    <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#FF2D7A' }} />
                    錄音中 {formatTime(recordingTime)}
                </div>
            )}

            <form onSubmit={onSubmit}
                className="relative flex items-center gap-2 rounded-full p-2 shadow-2xl"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>

                {/* Speech-to-text button */}
                <button type="button" onClick={onToggleListening}
                    className="p-2.5 rounded-full flex-shrink-0 transition"
                    style={isListening
                        ? { background: 'rgba(6,214,160,0.2)', color: '#06D6A0' }
                        : { background: 'rgba(255,255,255,0.08)', color: 'rgba(240,235,248,0.5)' }}
                    title={isListening ? '停止語音輸入' : '語音輸入'}
                >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                {/* Record audio button — main CTA */}
                {isRecording ? (
                    <button type="button" onClick={onStopRecording}
                        className="p-4 rounded-full flex-shrink-0 transition-all"
                        style={{
                            background: '#FF2D7A',
                            boxShadow: '0 0 20px rgba(255,45,122,0.6)',
                            animation: 'pulse 1s ease-in-out infinite',
                        }}
                        title="停止錄音"
                    >
                        <Square className="w-5 h-5 fill-white text-white" />
                    </button>
                ) : recordingUnlocked ? (
                    <button type="button" onClick={onStartRecording} disabled={!canRecord}
                        className="p-4 rounded-full flex-shrink-0 transition-all hover:scale-105"
                        style={{
                            background: 'linear-gradient(135deg, #FF2D7A, #8B5CF6)',
                            boxShadow: '0 0 24px rgba(255,45,122,0.45)',
                        }}
                        title="開始錄音唱歌"
                    >
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
                        </svg>
                    </button>
                ) : (
                    <button type="button" disabled
                        className="p-2.5 rounded-full flex-shrink-0 cursor-not-allowed"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(240,235,248,0.2)' }}
                        title="請先跟 Maicrophone 對話，取得目標後才能錄音"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
                        </svg>
                    </button>
                )}

                <input
                    type="text"
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder={isListening ? '聆聽中...' : isRecording ? '錄音中...' : '跟 Maicrophone 說話...'}
                    className="flex-1 bg-transparent border-none outline-none text-sm px-2 py-1"
                    style={{ color: 'white' }}
                />

                <button type="submit"
                    disabled={isLoading || (!input.trim() && !audioAttachment)}
                    className="p-2.5 rounded-full flex-shrink-0 transition disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg, #8B5CF6, #FF2D7A)' }}
                >
                    <Send className="w-4 h-4 text-white" />
                </button>
            </form>

            {!recordingUnlocked && (
                <p className="text-center text-xs" style={{ color: 'rgba(240,235,248,0.3)' }}>
                    請先跟 Maicrophone 對話，取得目標音符後才能錄音 🎵
                </p>
            )}
        </div>
    );
}
