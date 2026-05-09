'use client';

import { detectPitch, type PitchResult } from '@/lib/pitch-detection';
import { useCallback, useRef, useState } from 'react';

/**
 * Hook that taps into the AudioWorklet PCM stream to provide
 * real-time pitch detection results. Call `attach()` after an
 * AudioWorkletNode is set up and `detach()` when recording stops.
 */
export function usePitchDetection(sampleRate: number = 44100) {
    const [pitch, setPitch] = useState<PitchResult | null>(null);
    const bufferRef = useRef<Float32Array[]>([]);
    const rafRef = useRef<number | null>(null);
    const activeRef = useRef(false);
    const sampleRateRef = useRef(sampleRate);

    // Minimum samples needed for good detection (~93 ms at 44100)
    const MIN_SAMPLES = 4096;

    const analyse = useCallback(() => {
        if (!activeRef.current) return;

        const chunks = bufferRef.current;
        const totalLen = chunks.reduce((s, c) => s + c.length, 0);

        if (totalLen >= MIN_SAMPLES) {
            // Merge last MIN_SAMPLES
            const merged = new Float32Array(MIN_SAMPLES);
            let offset = MIN_SAMPLES;
            for (let i = chunks.length - 1; i >= 0 && offset > 0; i--) {
                const chunk = chunks[i];
                const copyLen = Math.min(chunk.length, offset);
                merged.set(chunk.subarray(chunk.length - copyLen), offset - copyLen);
                offset -= copyLen;
            }

            const result = detectPitch(merged, sampleRateRef.current);
            setPitch(result);

            // Keep only last chunk to avoid unbounded growth
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

            // Listen via addEventListener so we don't replace the recorder's onmessage handler
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
        setPitch(null);
        bufferRef.current = [];
    }, []);

    return { pitch, attach, detach };
}
