import { tool } from 'ai';
import { z } from 'zod';

import { makeUploadScoreTool } from './shared';

// --- Shared helpers ---

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

function decodeWav(buffer: ArrayBuffer): { samples: Float32Array; sampleRate: number } {
    const view = new DataView(buffer);
    const sampleRate = view.getUint32(24, true);
    const bitsPerSample = view.getUint16(34, true);
    const numChannels = view.getUint16(22, true);

    let offset = 12;
    while (offset < buffer.byteLength - 8) {
        const id = String.fromCharCode(
            view.getUint8(offset), view.getUint8(offset + 1),
            view.getUint8(offset + 2), view.getUint8(offset + 3),
        );
        const size = view.getUint32(offset + 4, true);
        if (id === 'data') { offset += 8; break; }
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

async function downloadAndDecode(audioUrl: string) {
    const res = await fetch(audioUrl, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Failed to download audio: ${res.status}`);
    const buffer = await res.arrayBuffer();
    return decodeWav(buffer);
}

// --- Frame-level feature extraction ---

interface FrameFeatures {
    rms: number;
    zcr: number;
    spectralFlatness: number;
    spectralSlope: number;
}

function computeRMS(frame: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
    return Math.sqrt(sum / frame.length);
}

function computeZCR(frame: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < frame.length; i++) {
        if ((frame[i] >= 0 && frame[i - 1] < 0) || (frame[i] < 0 && frame[i - 1] >= 0)) {
            crossings++;
        }
    }
    return crossings / (frame.length - 1);
}

function computeSpectrum(frame: Float32Array): Float32Array {
    const N = frame.length;
    const halfN = Math.floor(N / 2);
    const magnitudes = new Float32Array(halfN);

    // Apply Hann window
    const windowed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        windowed[i] = frame[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
    }

    for (let k = 0; k < halfN; k++) {
        let re = 0, im = 0;
        for (let n = 0; n < N; n++) {
            const angle = (2 * Math.PI * k * n) / N;
            re += windowed[n] * Math.cos(angle);
            im -= windowed[n] * Math.sin(angle);
        }
        magnitudes[k] = Math.sqrt(re * re + im * im);
    }

    return magnitudes;
}

function computeSpectralFlatness(magnitudes: Float32Array): number {
    const N = magnitudes.length;
    if (N === 0) return 0;

    let logSum = 0;
    let arithmeticSum = 0;
    let count = 0;

    for (let i = 1; i < N; i++) {
        const val = Math.max(magnitudes[i], 1e-10);
        logSum += Math.log(val);
        arithmeticSum += val;
        count++;
    }

    if (count === 0 || arithmeticSum === 0) return 0;
    const geometricMean = Math.exp(logSum / count);
    const arithmeticMean = arithmeticSum / count;
    return geometricMean / arithmeticMean;
}

function computeSpectralSlope(magnitudes: Float32Array): number {
    const N = magnitudes.length;
    if (N < 2) return 0;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < N; i++) {
        sumX += i;
        sumY += magnitudes[i];
        sumXY += i * magnitudes[i];
        sumXX += i * i;
    }

    const denom = N * sumXX - sumX * sumX;
    if (denom === 0) return 0;
    return (N * sumXY - sumX * sumY) / denom;
}

function extractFrameFeatures(frame: Float32Array): FrameFeatures {
    const rms = computeRMS(frame);
    const zcr = computeZCR(frame);

    let spectralFlatness = 0;
    let spectralSlope = 0;
    if (rms > 0.01) {
        const magnitudes = computeSpectrum(frame);
        spectralFlatness = computeSpectralFlatness(magnitudes);
        spectralSlope = computeSpectralSlope(magnitudes);
    }

    return { rms, zcr, spectralFlatness, spectralSlope };
}

function extractAllFrames(samples: Float32Array, sampleRate: number, windowSize = 1024, hopSize = 512) {
    const frames: Array<FrameFeatures & { startSample: number }> = [];
    for (let i = 0; i + windowSize <= samples.length; i += hopSize) {
        const frame = samples.slice(i, i + windowSize);
        const features = extractFrameFeatures(frame);
        frames.push({ ...features, startSample: i });
    }
    return frames;
}

type FrameStatus = 'clean' | 'breathy' | 'silence';

function classifyFrame(f: FrameFeatures): FrameStatus {
    if (f.rms < 0.015) return 'silence';
    if (f.spectralFlatness > 0.4 || f.zcr > 0.3) return 'breathy';
    return 'clean';
}

// --- Tools ---

export function makeLongToneTools(userId?: string) {
    return {
        analyzeCleanDuration: tool({
            description:
                'Analyze the clean (non-breathy, non-silent) duration of a long tone recording. Returns how many seconds the user maintained a clean tone.',
            inputSchema: z.object({
                targetNote: z.string().describe('Target note in scientific notation, e.g. "E4"'),
                audioUrl: z.string().url().describe('Public URL of the user\'s WAV recording'),
            }),
            execute: async ({ targetNote, audioUrl }) => {
                let samples: Float32Array, sampleRate: number;
                try {
                    ({ samples, sampleRate } = await downloadAndDecode(audioUrl));
                } catch (e: any) {
                    return { error: e.message };
                }

                const frames = extractAllFrames(samples, sampleRate);
                const frameDuration = 512 / sampleRate;

                let cleanFrames = 0;
                const timeline: Array<{ second: number; status: FrameStatus }> = [];
                const totalSeconds = Math.ceil(samples.length / sampleRate);

                for (let sec = 0; sec < totalSeconds; sec++) {
                    const startSample = sec * sampleRate;
                    const endSample = (sec + 1) * sampleRate;
                    const secFrames = frames.filter(
                        (f) => f.startSample >= startSample && f.startSample < endSample,
                    );

                    let cleanCount = 0, breathyCount = 0, silenceCount = 0;
                    for (const f of secFrames) {
                        const status = classifyFrame(f);
                        if (status === 'clean') cleanCount++;
                        else if (status === 'breathy') breathyCount++;
                        else silenceCount++;
                    }

                    const dominant: FrameStatus =
                        cleanCount >= breathyCount && cleanCount >= silenceCount ? 'clean'
                            : breathyCount >= silenceCount ? 'breathy'
                                : 'silence';

                    timeline.push({ second: sec + 1, status: dominant });
                    cleanFrames += cleanCount;
                }

                const cleanDurationSeconds = Math.round(cleanFrames * frameDuration * 10) / 10;
                const totalDurationSeconds = Math.round((samples.length / sampleRate) * 10) / 10;

                let score: number;
                if (cleanDurationSeconds >= 8) score = 15;
                else if (cleanDurationSeconds >= 5) score = 13;
                else if (cleanDurationSeconds >= 3) score = 10;
                else score = 5;

                return { cleanDurationSeconds, totalDurationSeconds, score, timeline };
            },
        }),

        analyzePitchStability: tool({
            description:
                'Analyze pitch stability of a long tone recording. Measures how consistently the user holds the target note by calculating cents deviation statistics.',
            inputSchema: z.object({
                targetNote: z.string().describe('Target note in scientific notation, e.g. "E4"'),
                audioUrl: z.string().url().describe('Public URL of the user\'s WAV recording'),
            }),
            execute: async ({ targetNote, audioUrl }) => {
                let samples: Float32Array, sampleRate: number;
                try {
                    ({ samples, sampleRate } = await downloadAndDecode(audioUrl));
                } catch (e: any) {
                    return { error: e.message };
                }

                let targetFreq: number;
                try {
                    targetFreq = noteToFreq(targetNote.trim());
                } catch (e: any) {
                    return { error: `Invalid target note "${targetNote}": ${e.message}` };
                }
                const windowSize = 2048;
                const hopSize = 512;

                const { PitchDetector } = await import('pitchy');
                const detector = PitchDetector.forFloat32Array(windowSize);

                const frameCents: Array<{ sample: number; cents: number; freq: number }> = [];

                for (let i = 0; i + windowSize <= samples.length; i += hopSize) {
                    const window = samples.slice(i, i + windowSize);
                    const [frequency, clarity] = detector.findPitch(window, sampleRate);
                    if (clarity >= 0.8 && frequency > 50 && frequency < 2000) {
                        const cents = 1200 * Math.log2(frequency / targetFreq);
                        frameCents.push({ sample: i, cents, freq: frequency });
                    }
                }

                if (frameCents.length === 0) {
                    return { targetNote, meanCentsOff: 0, stdCentsOff: 100, score: 2, timeline: [] };
                }

                const meanCents = frameCents.reduce((s, f) => s + f.cents, 0) / frameCents.length;
                const variance = frameCents.reduce((s, f) => s + (f.cents - meanCents) ** 2, 0) / frameCents.length;
                const stdCents = Math.sqrt(variance);

                const totalSeconds = Math.ceil(samples.length / sampleRate);
                const timeline: Array<{ second: number; centsOff: number; note: string }> = [];
                for (let sec = 0; sec < totalSeconds; sec++) {
                    const startSample = sec * sampleRate;
                    const endSample = (sec + 1) * sampleRate;
                    const secFrames = frameCents.filter(
                        (f) => f.sample >= startSample && f.sample < endSample,
                    );
                    if (secFrames.length > 0) {
                        const avgCents = Math.round(secFrames.reduce((s, f) => s + f.cents, 0) / secFrames.length);
                        const avgFreq = secFrames.reduce((s, f) => s + f.freq, 0) / secFrames.length;
                        const midi = Math.round(12 * Math.log2(avgFreq / 440) + 69);
                        const octave = Math.floor(midi / 12) - 1;
                        const noteName = NOTE_NAMES[((midi % 12) + 12) % 12];
                        timeline.push({ second: sec + 1, centsOff: avgCents, note: `${noteName}${octave}` });
                    }
                }

                let score: number;
                if (stdCents < 8) score = 15;
                else if (stdCents < 15) score = 12;
                else if (stdCents < 25) score = 8;
                else if (stdCents < 40) score = 5;
                else score = 2;

                return {
                    targetNote,
                    meanCentsOff: Math.round(meanCents * 10) / 10,
                    stdCentsOff: Math.round(stdCents * 10) / 10,
                    score,
                    timeline,
                };
            },
        }),

        analyzeToneQuality: tool({
            description:
                'Analyze tone quality of a long tone recording. Measures spectral flatness (breathiness) and spectral slope to evaluate how clean and pure the tone is.',
            inputSchema: z.object({
                audioUrl: z.string().url().describe('Public URL of the user\'s WAV recording'),
            }),
            execute: async ({ audioUrl }) => {
                let samples: Float32Array, sampleRate: number;
                try {
                    ({ samples, sampleRate } = await downloadAndDecode(audioUrl));
                } catch (e: any) {
                    return { error: e.message };
                }

                const frames = extractAllFrames(samples, sampleRate);
                const voiced = frames.filter((f) => f.rms >= 0.015);

                if (voiced.length === 0) {
                    return { avgSpectralFlatness: 1, avgSpectralSlope: 0, breathinessOnsetSecond: null, score: 2, timeline: [] };
                }

                const avgFlatness = voiced.reduce((s, f) => s + f.spectralFlatness, 0) / voiced.length;
                const avgSlope = voiced.reduce((s, f) => s + f.spectralSlope, 0) / voiced.length;

                const totalSeconds = Math.ceil(samples.length / sampleRate);
                const timeline: Array<{ second: number; spectralFlatness: number; quality: string }> = [];
                let breathinessOnsetSecond: number | null = null;

                for (let sec = 0; sec < totalSeconds; sec++) {
                    const startSample = sec * sampleRate;
                    const endSample = (sec + 1) * sampleRate;
                    const secFrames = voiced.filter(
                        (f) => f.startSample >= startSample && f.startSample < endSample,
                    );

                    if (secFrames.length > 0) {
                        const secFlatness = secFrames.reduce((s, f) => s + f.spectralFlatness, 0) / secFrames.length;
                        const quality = secFlatness < 0.2 ? 'clean' : secFlatness < 0.35 ? 'fair' : 'breathy';
                        timeline.push({
                            second: sec + 1,
                            spectralFlatness: Math.round(secFlatness * 1000) / 1000,
                            quality,
                        });
                        if (quality === 'breathy' && breathinessOnsetSecond === null) {
                            breathinessOnsetSecond = sec + 1;
                        }
                    }
                }

                let score: number;
                if (avgFlatness < 0.15) score = 10;
                else if (avgFlatness < 0.25) score = 8;
                else if (avgFlatness < 0.35) score = 5;
                else score = 2;

                return {
                    avgSpectralFlatness: Math.round(avgFlatness * 1000) / 1000,
                    avgSpectralSlope: Math.round(avgSlope * 10000) / 10000,
                    breathinessOnsetSecond,
                    score,
                    timeline,
                };
            },
        }),

        analyzeVolumeSteadiness: tool({
            description:
                'Analyze volume steadiness of a long tone recording. Measures how consistently the user maintains volume by calculating RMS coefficient of variation and detecting decay.',
            inputSchema: z.object({
                audioUrl: z.string().url().describe('Public URL of the user\'s WAV recording'),
            }),
            execute: async ({ audioUrl }) => {
                let samples: Float32Array, sampleRate: number;
                try {
                    ({ samples, sampleRate } = await downloadAndDecode(audioUrl));
                } catch (e: any) {
                    return { error: e.message };
                }

                const frames = extractAllFrames(samples, sampleRate);
                const voiced = frames.filter((f) => f.rms >= 0.015);

                if (voiced.length === 0) {
                    return { rmsCV: 1, rmsMean: 0, rmsStd: 0, decayDetected: false, score: 2, timeline: [] };
                }

                const rmsValues = voiced.map((f) => f.rms);
                const rmsMean = rmsValues.reduce((s, v) => s + v, 0) / rmsValues.length;
                const rmsVariance = rmsValues.reduce((s, v) => s + (v - rmsMean) ** 2, 0) / rmsValues.length;
                const rmsStd = Math.sqrt(rmsVariance);
                const rmsCV = rmsMean > 0 ? rmsStd / rmsMean : 1;

                const thirdLen = Math.floor(voiced.length / 3);
                const firstThirdMean = thirdLen > 0
                    ? voiced.slice(0, thirdLen).reduce((s, f) => s + f.rms, 0) / thirdLen
                    : rmsMean;
                const lastThirdMean = thirdLen > 0
                    ? voiced.slice(-thirdLen).reduce((s, f) => s + f.rms, 0) / thirdLen
                    : rmsMean;
                const decayDetected = lastThirdMean < firstThirdMean * 0.6;

                const totalSeconds = Math.ceil(samples.length / sampleRate);
                const timeline: Array<{ second: number; rms: number }> = [];
                for (let sec = 0; sec < totalSeconds; sec++) {
                    const startSample = sec * sampleRate;
                    const endSample = (sec + 1) * sampleRate;
                    const secFrames = voiced.filter(
                        (f) => f.startSample >= startSample && f.startSample < endSample,
                    );
                    if (secFrames.length > 0) {
                        const secRms = secFrames.reduce((s, f) => s + f.rms, 0) / secFrames.length;
                        timeline.push({ second: sec + 1, rms: Math.round(secRms * 10000) / 10000 });
                    }
                }

                let score: number;
                if (rmsCV < 0.1) score = 10;
                else if (rmsCV < 0.2) score = 8;
                else if (rmsCV < 0.3) score = 5;
                else score = 2;

                return {
                    rmsCV: Math.round(rmsCV * 1000) / 1000,
                    rmsMean: Math.round(rmsMean * 10000) / 10000,
                    rmsStd: Math.round(rmsStd * 10000) / 10000,
                    decayDetected,
                    score,
                    timeline,
                };
            },
        }),

        uploadScore: makeUploadScoreTool(userId, ['stability']),
    };
}
