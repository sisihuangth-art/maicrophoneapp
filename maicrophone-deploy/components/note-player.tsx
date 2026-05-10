'use client';
import { Play, Square, Volume2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface NotePlayerProps {
    notes: string[];
}

// ── 唱名對照表 ─────────────────────────────────────────────────
const SOLFEGE: Record<string, string> = {
    'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa',
    'G': 'Sol', 'A': 'La', 'B': 'Si',
    'C#': 'Do#', 'Db': 'Do#',
    'D#': 'Re#', 'Eb': 'Re#',
    'F#': 'Fa#', 'Gb': 'Fa#',
    'G#': 'Sol#', 'Ab': 'Sol#',
    'A#': 'La#', 'Bb': 'La#',
};

function getSolfege(note: string): string {
    const match = note.match(/^([A-G]#?b?)/);
    const base = match ? match[1] : note;
    return SOLFEGE[base] ?? base;
}

// ── MIDI 計算 ──────────────────────────────────────────────────
const NOTE_SEMITONES: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

function noteToMidi(note: string): number {
    const match = note.match(/^([A-G]#?b?)(\d)$/);
    if (!match) return 60;
    const semitone = NOTE_SEMITONES[match[1]] ?? 0;
    const octave = parseInt(match[2], 10);
    return (octave + 1) * 12 + semitone;
}

const CONTAINER_H = 140;
const PILL_H = 48; // 加高以容納唱名
const VERTICAL_RANGE = CONTAINER_H - PILL_H;

function computePositions(notes: string[]) {
    const midis = notes.map(noteToMidi);
    const minMidi = Math.min(...midis);
    const maxMidi = Math.max(...midis);
    const midiRange = maxMidi - minMidi;

    return notes.map((_, i) => {
        const normalized = midiRange === 0 ? 0.5 : (midis[i] - minMidi) / midiRange;
        const centerX = (i + 0.5) * 100 / notes.length;
        const centerY = PILL_H / 2 + (1 - normalized) * VERTICAL_RANGE;
        return { centerX, centerY };
    });
}

export function NotePlayer({ notes }: NotePlayerProps) {
    const [playing, setPlaying] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const stopRef = useRef(false);

    const positions = computePositions(notes);

    const playNotes = useCallback(async () => {
        if (playing) {
            stopRef.current = true;
            return;
        }
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
            <div className="relative w-full" style={{ height: `${CONTAINER_H}px` }}>

                {/* SVG 虛線連接 */}
                <svg
                    width="100%"
                    height={CONTAINER_H}
                    viewBox={`0 0 100 ${CONTAINER_H}`}
                    preserveAspectRatio="none"
                    className="absolute inset-0 pointer-events-none"
                >
                    {positions.slice(0, -1).map((pos, i) => {
                        const next = positions[i + 1];
                        return (
                            <line
                                key={i}
                                x1={pos.centerX} y1={pos.centerY}
                                x2={next.centerX} y2={next.centerY}
                                stroke={activeIndex === i || activeIndex === i + 1
                                    ? 'rgba(255,45,122,0.6)'
                                    : 'rgba(255,255,255,0.15)'}
                                strokeWidth="0.5"
                                strokeDasharray="2 2"
                                strokeLinecap="round"
                            />
                        );
                    })}
                </svg>

                {/* 音符 Pills */}
                {notes.map((note, i) => {
                    const { centerX, centerY } = positions[i];
                    const isActive = activeIndex === i;
                    const solfege = getSolfege(note);
                    return (
                        <div
                            key={i}
                            className="absolute flex flex-col items-center justify-center gap-0.5 px-3 rounded-xl border transition-all duration-200"
                            style={{
                                left: `${centerX}%`,
                                top: `${centerY - PILL_H / 2}px`,
                                height: `${PILL_H}px`,
                                minWidth: '52px',
                                transform: isActive
                                    ? 'translateX(-50%) scale(1.12)'
                                    : 'translateX(-50%)',
                                background: isActive
                                    ? 'rgba(255,45,122,0.25)'
                                    : 'rgba(255,255,255,0.06)',
                                borderColor: isActive
                                    ? 'rgba(255,45,122,0.7)'
                                    : 'rgba(255,255,255,0.15)',
                                boxShadow: isActive
                                    ? '0 0 12px rgba(255,45,122,0.35)'
                                    : undefined,
                            }}
                        >
                            {/* 音符名稱 */}
                            <div className="flex items-center gap-0.5">
                                <Volume2
                                    className="w-2.5 h-2.5 flex-shrink-0"
                                    style={{ color: isActive ? '#FF2D7A' : 'rgba(240,235,248,0.4)', opacity: isActive ? 1 : 0.5 }}
                                />
                                <span className="text-xs font-mono font-bold"
                                    style={{ color: isActive ? '#FF2D7A' : 'rgba(240,235,248,0.8)' }}>
                                    {note}
                                </span>
                            </div>
                            {/* 唱名 */}
                            <div className="text-[10px] font-medium"
                                style={{ color: isActive ? 'rgba(255,45,122,0.8)' : 'rgba(240,235,248,0.35)' }}>
                                {solfege}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 播放按鈕 */}
            <button
                onClick={playNotes}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={
                    playing
                        ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }
                        : { background: 'rgba(255,45,122,0.15)', border: '1px solid rgba(255,45,122,0.4)', color: '#FF2D7A' }
                }
            >
                {playing ? (
                    <><Square className="w-4 h-4" />停止播放</>
                ) : (
                    <><Play className="w-4 h-4" />播放音符</>
                )}
            </button>
        </div>
    );
}
