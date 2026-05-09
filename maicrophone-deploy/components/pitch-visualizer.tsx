'use client';

import type { PitchResult } from '@/lib/pitch-detection';
import { Volume2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PitchVisualizerProps {
    pitch: PitchResult | null;
    isRecording: boolean;
    /** Target notes to play and follow, e.g. ["C4","E4","G4"] */
    targetNotes?: string[];
}

/** Note name + octave → frequency */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function noteToSemitone(note: string): number {
    const match = note.match(/^([A-G]#?)(\d)$/);
    if (!match) return 0;
    const idx = NOTE_NAMES.indexOf(match[1]);
    const octave = parseInt(match[2], 10);
    return (octave + 1) * 12 + idx;
}

function centsBetween(detected: string, target: string): number {
    return (noteToSemitone(detected) - noteToSemitone(target)) * 100;
}

function getTuningLabel(cents: number): { text: string; color: string } {
    const abs = Math.abs(cents);
    if (abs <= 10) return { text: '🎯 準確！', color: 'text-green-400' };
    if (abs <= 25) {
        return cents > 0
            ? { text: '⬆ 稍高', color: 'text-yellow-400' }
            : { text: '⬇ 稍低', color: 'text-yellow-400' };
    }
    if (abs <= 100) {
        return cents > 0
            ? { text: '⬆ 太高了', color: 'text-red-400' }
            : { text: '⬇ 太低了', color: 'text-red-400' };
    }
    return cents > 0
        ? { text: '⬆ 太高了', color: 'text-red-400' }
        : { text: '⬇ 太低了', color: 'text-red-400' };
}

/**
 * Real-time pitch display with target note playback.
 * When recording starts, plays each target note in sequence so the user
 * can hear and follow along. Shows target vs detected pitch comparison.
 */
export function PitchVisualizer({ pitch, isRecording, targetNotes = [] }: PitchVisualizerProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [countdown, setCountdown] = useState<number | null>(null);
    const stopRef = useRef(false);
    const hasTargets = targetNotes.length > 0;

    // Play target notes sequentially when recording starts
    const playSequence = useCallback(async () => {
        if (targetNotes.length === 0) return;

        const Tone = await import('tone');
        await Tone.start();

        const synth = new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.05, decay: 0.1, sustain: 0.5, release: 0.3 },
            volume: -6,
        }).toDestination();

        stopRef.current = false;

        // Brief countdown before starting
        for (let c = 3; c >= 1; c--) {
            if (stopRef.current) break;
            setCountdown(c);
            await new Promise((r) => setTimeout(r, 700));
        }
        setCountdown(null);

        for (let i = 0; i < targetNotes.length; i++) {
            if (stopRef.current) break;
            setActiveIndex(i);
            // Play the reference tone for 0.6s, then give 1.4s for the user to sing
            synth.triggerAttackRelease(targetNotes[i], '0.6');
            await new Promise((r) => setTimeout(r, 2000));
        }

        synth.dispose();
        setActiveIndex(null);
    }, [targetNotes]);

    useEffect(() => {
        if (isRecording && hasTargets) {
            playSequence();
        }
        if (!isRecording) {
            stopRef.current = true;
            setActiveIndex(null);
            setCountdown(null);
        }
        return () => {
            stopRef.current = true;
        };
    }, [isRecording, hasTargets, playSequence]);

    if (!isRecording) return null;

    const currentTarget = activeIndex != null ? targetNotes[activeIndex] : null;
    const hasNote = pitch?.note != null;

    // Compute cents relative to target (if available), otherwise use raw cents
    const centsFromTarget =
        hasNote && currentTarget
            ? centsBetween(pitch!.note!, currentTarget) + (pitch!.cents ?? 0)
            : pitch?.cents ?? 0;

    const tuning = hasNote && currentTarget ? getTuningLabel(centsFromTarget) : null;
    const clampedCents = Math.max(-50, Math.min(50, centsFromTarget));

    return (
        <div className="flex flex-col items-center gap-2 w-full max-w-sm mx-auto animate-in fade-in duration-300 pb-2">
            {/* Countdown */}
            {countdown != null && (
                <span className="text-2xl font-bold text-pink-400 animate-pulse">{countdown}…</span>
            )}

            {/* Target note pills */}
            {hasTargets && countdown == null && (
                <div className="flex gap-1.5 flex-wrap justify-center">
                    {targetNotes.map((note, i) => (
                        <div
                            key={i}
                            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition-all duration-200 ${activeIndex === i
                                    ? 'bg-pink-500/30 border-pink-400 text-pink-200 scale-110 shadow-lg shadow-pink-500/20'
                                    : i < (activeIndex ?? -1)
                                        ? 'bg-zinc-800/40 border-zinc-700/50 text-zinc-600'
                                        : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
                                }`}
                        >
                            <Volume2
                                className={`w-3 h-3 inline mr-1 ${activeIndex === i ? 'animate-pulse' : 'opacity-30'}`}
                            />
                            {note}
                        </div>
                    ))}
                </div>
            )}

            {/* Target vs Detected comparison */}
            {countdown == null && (
                <div className="flex items-center gap-4">
                    {/* Target */}
                    {currentTarget && (
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">目標</span>
                            <span className="text-2xl font-extrabold text-pink-400">{currentTarget}</span>
                        </div>
                    )}

                    {currentTarget && <span className="text-zinc-600 text-lg">→</span>}

                    {/* Detected */}
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                            {currentTarget ? '你唱的' : '偵測中'}
                        </span>
                        <span
                            className={`text-2xl font-extrabold tabular-nums transition-colors ${hasNote ? 'text-white' : 'text-zinc-700'}`}
                        >
                            {hasNote ? pitch!.note : '…'}
                        </span>
                        {hasNote && (
                            <span className="text-[10px] text-zinc-600">{pitch!.frequency} Hz</span>
                        )}
                    </div>
                </div>
            )}

            {/* Tuning feedback */}
            {tuning && <span className={`text-sm font-semibold ${tuning.color}`}>{tuning.text}</span>}

            {/* Visual tuning bar */}
            {countdown == null && (
                <div className="w-full space-y-1">
                    <div className="relative w-full h-4 rounded-full bg-zinc-800 border border-zinc-700">
                        <div className="absolute inset-0 flex rounded-full overflow-hidden">
                            <div className="flex-1 bg-red-500/15" />
                            <div className="flex-1 bg-yellow-500/15" />
                            <div className="flex-1 bg-green-500/20" />
                            <div className="flex-1 bg-yellow-500/15" />
                            <div className="flex-1 bg-red-500/15" />
                        </div>
                        <div className="absolute left-1/2 top-0 -translate-x-px w-0.5 h-full bg-zinc-500" />
                        {hasNote && (
                            <div
                                className="absolute top-0.5 bottom-0.5 w-2 rounded-full shadow-lg transition-all duration-100 ease-out"
                                style={{
                                    left: `${50 + clampedCents}%`,
                                    transform: 'translateX(-50%)',
                                    backgroundColor:
                                        Math.abs(centsFromTarget) <= 10
                                            ? '#4ade80'
                                            : Math.abs(centsFromTarget) <= 25
                                                ? '#facc15'
                                                : '#f87171',
                                }}
                            />
                        )}
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-600 px-1">
                        <span>太低</span>
                        <span>準確</span>
                        <span>太高</span>
                    </div>
                </div>
            )}
        </div>
    );
}
