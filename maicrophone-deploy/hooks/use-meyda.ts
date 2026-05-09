'use client';

import { useCallback, useRef, useState } from 'react';

export interface MeydaFeatures {
    /** Root mean square (volume level) */
    rms: number;
    /** Spectral flatness (0 = tonal, 1 = noisy/breathy) */
    spectralFlatness: number;
    /** Current detected pitch frequency in Hz, or null */
    frequency: number | null;
    /** Cents offset from target note */
    centsOff: number;
}

/**
 * Hook that provides real-time audio feature extraction during recording.
 * Taps into the AudioWorkletNode PCM stream, computing RMS, spectral flatness,
 * and pitch detection on every animation frame.
 */
export function useMeyda(targetFreq: number | null = null) {
    const [features, setFeatures] = useState<MeydaFeatures | null>(null);
    const [rmsHistory, setRmsHistory] = useState<number[]>([]);

    const bufferRef = useRef<Float32Array[]>([]);
    const rafRef = useRef<number | null>(null);
    const activeRef = useRef(false);
    const sampleRateRef = useRef(44100);
    const targetFreqRef = useRef(targetFreq);
    targetFreqRef.current = targetFreq;

    const WINDOW_SIZE = 2048;

    const computeRMS = (buf: Float32Array): number => {
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
        return Math.sqrt(sum / buf.length);
    };

    const computeSpectralFlatness = (buf: Float32Array): number => {
        // Apply Hann window
        const N = buf.length;
        const windowed = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            windowed[i] = buf[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
        }

        const halfN = Math.floor(N / 2);
        const magnitudes = new Float32Array(halfN);
        for (let k = 0; k < halfN; k++) {
            let re = 0, im = 0;
            for (let n = 0; n < N; n++) {
                const angle = (2 * Math.PI * k * n) / N;
                re += windowed[n] * Math.cos(angle);
                im -= windowed[n] * Math.sin(angle);
            }
            magnitudes[k] = Math.sqrt(re * re + im * im);
        }

        let logSum = 0, arithmeticSum = 0, count = 0;
        for (let i = 1; i < halfN; i++) {
            const val = Math.max(magnitudes[i], 1e-10);
            logSum += Math.log(val);
            arithmeticSum += val;
            count++;
        }
        if (count === 0 || arithmeticSum === 0) return 0;
        return Math.exp(logSum / count) / (arithmeticSum / count);
    };

    const detectFrequency = (buf: Float32Array, sr: number): number | null => {
        // Simple autocorrelation pitch detection
        const SIZE = buf.length;
        let rms = 0;
        for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) return null;

        const minLag = Math.floor(sr / 1000); // 1000 Hz max
        const maxLag = Math.floor(sr / 60);   // 60 Hz min

        let bestCorr = 0;
        let bestLag = 0;

        for (let lag = minLag; lag <= Math.min(maxLag, SIZE - 1); lag++) {
            let corr = 0;
            for (let i = 0; i < SIZE - lag; i++) {
                corr += buf[i] * buf[i + lag];
            }
            if (corr > bestCorr) {
                bestCorr = corr;
                bestLag = lag;
            }
        }

        if (bestLag === 0 || bestCorr < 0.01) return null;

        // Normalize correlation
        let energy = 0;
        for (let i = 0; i < SIZE; i++) energy += buf[i] * buf[i];
        if (bestCorr / energy < 0.3) return null;

        return sr / bestLag;
    };

    const analyse = useCallback(() => {
        if (!activeRef.current) return;

        const chunks = bufferRef.current;
        const totalLen = chunks.reduce((s, c) => s + c.length, 0);

        if (totalLen >= WINDOW_SIZE) {
            const merged = new Float32Array(WINDOW_SIZE);
            let offset = WINDOW_SIZE;
            for (let i = chunks.length - 1; i >= 0 && offset > 0; i--) {
                const chunk = chunks[i];
                const copyLen = Math.min(chunk.length, offset);
                merged.set(chunk.subarray(chunk.length - copyLen), offset - copyLen);
                offset -= copyLen;
            }

            const rms = computeRMS(merged);
            const spectralFlatness = rms > 0.01 ? computeSpectralFlatness(merged) : 0;
            const frequency = detectFrequency(merged, sampleRateRef.current);

            let centsOff = 0;
            if (frequency && targetFreqRef.current) {
                centsOff = Math.round(1200 * Math.log2(frequency / targetFreqRef.current));
            }

            setFeatures({ rms, spectralFlatness, frequency, centsOff });
            setRmsHistory((prev) => {
                const next = [...prev, rms];
                // Keep last 60 values (~1 minute at ~1 fps animation)
                return next.length > 60 ? next.slice(-60) : next;
            });

            if (chunks.length > 10) {
                bufferRef.current = chunks.slice(-4);
            }
        }

        rafRef.current = requestAnimationFrame(analyse);
    }, []);

    const attach = useCallback(
        (workletNode: AudioWorkletNode, rate: number) => {
            sampleRateRef.current = rate;
            bufferRef.current = [];
            activeRef.current = true;
            setRmsHistory([]);
            setFeatures(null);

            workletNode.port.addEventListener('message', (e: MessageEvent<Float32Array>) => {
                if (activeRef.current) {
                    bufferRef.current.push(e.data);
                }
            });

            rafRef.current = requestAnimationFrame(analyse);
        },
        [analyse],
    );

    const detach = useCallback(() => {
        activeRef.current = false;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        setFeatures(null);
    }, []);

    return { features, rmsHistory, attach, detach };
}
