'use client';

import { encodeWav } from '@/lib/encode-wav';
import { useCallback, useRef, useState } from 'react';

export interface AudioAttachment {
  blob: Blob;
  url: string;
}

export interface AudioRecorderOptions {
  /** Called when the AudioWorkletNode is ready — use this to attach pitch detection. */
  onWorkletReady?: (node: AudioWorkletNode, sampleRate: number) => void;
  /** Called when recording stops. */
  onRecordingStop?: () => void;
}

/**
 * Hook that records audio from the microphone and produces a WAV blob.
 */
export function useAudioRecorder(options?: AudioRecorderOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioAttachment, setAudioAttachment] = useState<AudioAttachment | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      // Use the hardware's native sample rate to avoid resampling artifacts
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      // Load AudioWorklet for off-main-thread PCM capture
      await audioCtx.audioWorklet.addModule('/pcm-worker.js');

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const workletNode = new AudioWorkletNode(audioCtx, 'pcm-recorder-processor');
      workletNodeRef.current = workletNode;

      const pcmChunks: Float32Array[] = [];
      pcmChunksRef.current = pcmChunks;

      workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
        pcmChunks.push(e.data);
      };

      // Must connect through to destination so the browser processes audio
      source.connect(workletNode);
      workletNode.connect(audioCtx.destination);

      optionsRef.current?.onWorkletReady?.(workletNode, audioCtx.sampleRate);

      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone. Please ensure permissions are granted.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    // Signal the worklet to stop
    workletNodeRef.current?.port.postMessage('stop');
    workletNodeRef.current?.disconnect();
    sourceRef.current?.disconnect();

    const audioCtx = audioCtxRef.current;
    const pcmChunks = pcmChunksRef.current;

    if (audioCtx && pcmChunks.length > 0) {
      // Merge PCM chunks into a single buffer
      const totalLength = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of pcmChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const wavBlob = encodeWav(merged, audioCtx.sampleRate);
      const url = URL.createObjectURL(wavBlob);
      setAudioAttachment({ blob: wavBlob, url });

      audioCtx.close();
    }

    // Stop all mic tracks
    streamRef.current?.getTracks().forEach((t) => t.stop());

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    optionsRef.current?.onRecordingStop?.();
  }, []);

  const clearAttachment = useCallback(() => {
    if (audioAttachment) URL.revokeObjectURL(audioAttachment.url);
    setAudioAttachment(null);
  }, [audioAttachment]);

  return {
    isRecording,
    recordingTime,
    audioAttachment,
    startRecording,
    stopRecording,
    clearAttachment,
  };
}
