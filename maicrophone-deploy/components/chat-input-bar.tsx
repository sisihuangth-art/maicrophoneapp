import type { AudioAttachment } from '@/hooks/use-audio-recorder';
import { Circle, FileAudio, Mic, MicOff, Send, Square, X } from 'lucide-react';

interface ChatInputBarProps {
    input: string;
    onInputChange: (value: string) => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;

    // Speech-to-text
    isListening: boolean;
    onToggleListening: () => void;

    // Audio recorder
    isRecording: boolean;
    recordingTime: number;
    audioAttachment: AudioAttachment | null;
    onStartRecording: () => void;
    onStopRecording: () => void;
    onClearAttachment: () => void;
}

function formatTime(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export function ChatInputBar({
    input,
    onInputChange,
    onSubmit,
    isLoading,
    isListening,
    onToggleListening,
    isRecording,
    recordingTime,
    audioAttachment,
    onStartRecording,
    onStopRecording,
    onClearAttachment,
}: ChatInputBarProps) {
    return (
        <div className="relative z-10 w-full max-w-3xl shrink-0 pb-4 space-y-2">
            {/* Audio attachment preview */}
            {audioAttachment && (
                <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2 mx-2">
                    <FileAudio className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                    <audio src={audioAttachment.url} controls className="h-8 flex-1" />
                    <span className="text-xs text-zinc-400 flex-shrink-0">.wav</span>
                    <button
                        type="button"
                        onClick={onClearAttachment}
                        className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm animate-pulse">
                    <Circle className="w-3 h-3 fill-red-500 text-red-500" />
                    <span>Recording {formatTime(recordingTime)}</span>
                </div>
            )}

            <form
                onSubmit={onSubmit}
                className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-full shadow-2xl p-2 gap-1"
            >
                {/* Speech-to-text button */}
                <button
                    type="button"
                    onClick={onToggleListening}
                    className={`p-3 rounded-full transition-colors flex-shrink-0 ${isListening
                        ? 'text-green-400 bg-green-500/20 hover:bg-green-500/30 animate-pulse'
                        : 'text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700'
                        }`}
                    aria-label={isListening ? 'Stop speech-to-text' : 'Speech-to-text'}
                    title="Speech to text"
                >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Record audio button */}
                <button
                    type="button"
                    onClick={isRecording ? onStopRecording : onStartRecording}
                    className={`p-3 rounded-full transition-colors flex-shrink-0 ${isRecording
                        ? 'text-red-500 bg-red-500/20 hover:bg-red-500/30 animate-pulse'
                        : 'text-red-500 hover:text-red-400 bg-red-500/20 hover:bg-red-500/30'
                        }`}
                    aria-label={isRecording ? 'Stop recording' : 'Record audio'}
                    title="Record audio"
                >
                    {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Circle className="w-5 h-5" />}
                </button>

                <input
                    type="text"
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder={isListening ? 'Listening...' : 'Ask your vocal coach anything...'}
                    className="flex-1 bg-transparent border-none text-white focus:ring-0 px-2 py-2 text-base outline-none placeholder:text-zinc-500"
                />

                <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && !audioAttachment)}
                    className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    aria-label="Send message"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
}
