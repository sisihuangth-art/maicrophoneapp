import { tool } from 'ai';
import { z } from 'zod';

import { makeUploadScoreTool } from './shared';

// --- Note / frequency helpers ---

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function noteToFreq(note: string): number {
    const match = note.match(/^([A-Ga-g]#?b?)(\d)$/);
    if (!match) throw new Error(`Invalid note: ${note}`);
    let name = match[1].toUpperCase();
    const octave = parseInt(match[2], 10);
    if (name.endsWith('B') && name.length === 2) {
        const idx = NOTE_NAMES.indexOf(name.charAt(0) as any);
        name = NOTE_NAMES[(idx - 1 + 12) % 12];
    }
    const semitone = NOTE_NAMES.indexOf(name as any);
    if (semitone === -1) throw new Error(`Unknown note name: ${name}`);
    const midi = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midi - 69) / 12);
}

function freqToNote(freq: number): { note: string; centsOff: number } {
    const midi = 12 * Math.log2(freq / 440) + 69;
    const rounded = Math.round(midi);
    const centsOff = Math.round((midi - rounded) * 100);
    const octave = Math.floor(rounded / 12) - 1;
    const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
    return { note: `${name}${octave}`, centsOff };
}

function centsDiff(detected: number, target: number): number {
    return Math.round(1200 * Math.log2(detected / target));
}

function scoreNote(cents: number): { noteScore: number; label: string } {
    const absCents = Math.abs(cents);
    if (absCents <= 10) return { noteScore: 10, label: 'excellent' };
    if (absCents <= 25) return { noteScore: 8, label: 'good' };
    if (absCents <= 50) return { noteScore: 5, label: 'fair' };
    return { noteScore: 2, label: 'miss' };
}

function decodeWav(buffer: ArrayBuffer): { samples: Float32Array; sampleRate: number } {
    const view = new DataView(buffer);
    const sampleRate = view.getUint32(24, true);
    const bitsPerSample = view.getUint16(34, true);
    const numChannels = view.getUint16(22, true);

    let offset = 12;
    while (offset < buffer.byteLength - 8) {
        const id = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
        const size = view.getUint32(offset + 4, true);
        if (id === 'data') {
            offset += 8;
            break;
        }
        offset += 8 + size;
    }

    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = Math.floor((buffer.byteLength - offset) / bytesPerSample / numChannels);
    const samples = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
        const byteOffset = offset + i * numChannels * bytesPerSample;
        if (bitsPerSample === 16) {
            samples[i] = view.getInt16(byteOffset, true) / 32768;
        } else if (bitsPerSample === 32) {
            samples[i] = view.getFloat32(byteOffset, true);
        } else {
            samples[i] = (view.getUint8(byteOffset) - 128) / 128;
        }
    }

    return { samples, sampleRate };
}

interface NoteEvent {
    frequency: number;
    startFrame: number;
    endFrame: number;
    frames: number[];
}

async function detectNoteEvents(samples: Float32Array, sampleRate: number): Promise<NoteEvent[]> {
    const windowSize = 2048;
    const hopSize = 512;
    const clarityThreshold = 0.85;

    const { PitchDetector } = await import('pitchy');
    const detector = PitchDetector.forFloat32Array(windowSize);
    const pitchedFrames: { freq: number; frameIdx: number }[] = [];

    for (let i = 0; i + windowSize <= samples.length; i += hopSize) {
        const window = samples.slice(i, i + windowSize);
        const [frequency, clarity] = detector.findPitch(window, sampleRate);
        if (clarity >= clarityThreshold && frequency > 50 && frequency < 2000) {
            pitchedFrames.push({ freq: frequency, frameIdx: i });
        }
    }

    if (pitchedFrames.length === 0) return [];

    const events: NoteEvent[] = [];
    let current: NoteEvent = {
        frequency: pitchedFrames[0].freq,
        startFrame: pitchedFrames[0].frameIdx,
        endFrame: pitchedFrames[0].frameIdx,
        frames: [pitchedFrames[0].freq],
    };

    for (let i = 1; i < pitchedFrames.length; i++) {
        const f = pitchedFrames[i];
        const centsFromCurrent = Math.abs(1200 * Math.log2(f.freq / current.frequency));
        const isContiguous = (f.frameIdx - current.endFrame) <= hopSize * 3;

        if (centsFromCurrent < 100 && isContiguous) {
            current.endFrame = f.frameIdx;
            current.frames.push(f.freq);
        } else {
            events.push(current);
            current = {
                frequency: f.freq,
                startFrame: f.frameIdx,
                endFrame: f.frameIdx,
                frames: [f.freq],
            };
        }
    }
    events.push(current);

    for (const event of events) {
        const sorted = [...event.frames].sort((a, b) => a - b);
        event.frequency = sorted[Math.floor(sorted.length / 2)];
    }

    return events.filter((e) => e.frames.length >= 5);
}

export function makePitchMatchingTools(userId?: string) {
    return {
        analyzePitch: tool({
            description:
                'Analyze a user\'s singing recording against target notes. Downloads the WAV, detects pitched note events, aligns them with target notes, and returns per-note scores.',
            inputSchema: z.object({
                targetNotes: z.array(z.string()).length(5).describe('Array of 5 target notes in scientific notation, e.g. ["C4", "E4", "G4", "A4", "C5"]'),
                audioUrl: z.string().url().describe('Public URL of the user\'s WAV recording'),
            }),
            execute: async ({ targetNotes, audioUrl }) => {
                const res = await fetch(audioUrl, { signal: AbortSignal.timeout(30_000) });
                if (!res.ok) return { error: `Failed to download audio: ${res.status}` };
                const buffer = await res.arrayBuffer();

                let samples: Float32Array;
                let sampleRate: number;
                try {
                    ({ samples, sampleRate } = decodeWav(buffer));
                } catch (e: any) {
                    return { error: `Failed to decode WAV: ${e.message}` };
                }

                const events = await detectNoteEvents(samples, sampleRate);

                const targetFreqs = targetNotes.map(noteToFreq);
                const results: Array<{
                    target: string;
                    detected: string | null;
                    centsOff: number;
                    hit: boolean;
                    noteScore: number;
                    label: string;
                }> = [];

                if (events.length === 0) {
                    for (const note of targetNotes) {
                        results.push({ target: note, detected: null, centsOff: 0, hit: false, noteScore: 0, label: 'undetected' });
                    }
                } else {
                    let selectedEvents = events;
                    if (events.length > targetNotes.length) {
                        selectedEvents = [...events]
                            .sort((a, b) => b.frames.length - a.frames.length)
                            .slice(0, targetNotes.length)
                            .sort((a, b) => a.startFrame - b.startFrame);
                    }

                    for (let i = 0; i < targetNotes.length; i++) {
                        if (i >= selectedEvents.length) {
                            results.push({ target: targetNotes[i], detected: null, centsOff: 0, hit: false, noteScore: 0, label: 'undetected' });
                            continue;
                        }
                        const event = selectedEvents[i];
                        const cents = centsDiff(event.frequency, targetFreqs[i]);
                        const { note: detectedNote } = freqToNote(event.frequency);
                        const { noteScore, label } = scoreNote(cents);
                        results.push({
                            target: targetNotes[i],
                            detected: detectedNote,
                            centsOff: cents,
                            hit: Math.abs(cents) <= 50,
                            noteScore,
                            label,
                        });
                    }
                }

                const score = results.reduce((sum, r) => sum + r.noteScore, 0);

                return { results, score };
            },
        }),
        uploadScore: makeUploadScoreTool(userId, ['pitch']),
    };
}
