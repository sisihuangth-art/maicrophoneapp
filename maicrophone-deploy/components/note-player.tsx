'use client';

import { Play, Square, Volume2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface NotePlayerProps {
    notes: string[];
}

export function NotePlayer({ notes }: NotePlayerProps) {
    const [playing, setPlaying] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const stopRef = useRef(false);

    const playNotes = useCallback(async () => {
        if (playing) {
            stopRef.current = true;
            return;
        }

        // Dynamic import to avoid SSR issues
        const Tone = await import('tone');
        await Tone.start();

        const synth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.3 },
        }).toDestination();

        setPlaying(true);
        stopRef.current = false;

        for (let i = 0; i < notes.length; i++) {
            if (stopRef.current) break;
            setActiveIndex(i);
            synth.triggerAttackRelease(notes[i], '0.8');
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        synth.dispose();
        setPlaying(false);
        setActiveIndex(null);
    }, [notes, playing]);

    return (
        <div className="mt-2 space-y-3">
            {/* Note pills */}
            <div className="flex flex-wrap gap-2">
                {notes.map((note, i) => (
                    <div
                        key={i}
                        className={`
              px-4 py-2 rounded-xl text-sm font-mono font-bold border transition-all duration-200
              ${activeIndex === i
                                ? 'bg-pink-500/30 border-pink-400 text-pink-200 scale-110 shadow-lg shadow-pink-500/20'
                                : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
                            }
            `}
                    >
                        <Volume2 className={`w-3 h-3 inline mr-1.5 ${activeIndex === i ? 'animate-pulse' : 'opacity-40'}`} />
                        {note}
                    </div>
                ))}
            </div>

            {/* Play button */}
            <button
                onClick={playNotes}
                className={`
          flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
          ${playing
                        ? 'bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30'
                        : 'bg-pink-500/20 border border-pink-500/50 text-pink-300 hover:bg-pink-500/30'
                    }
        `}
            >
                {playing ? (
                    <>
                        <Square className="w-4 h-4" />
                        停止播放
                    </>
                ) : (
                    <>
                        <Play className="w-4 h-4" />
                        播放音符
                    </>
                )}
            </button>
        </div>
    );
}
