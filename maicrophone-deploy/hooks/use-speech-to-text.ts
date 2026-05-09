'use client';

import { useCallback, useRef, useState } from 'react';

interface UseSpeechToTextOptions {
    lang?: string;
    continuous?: boolean;
    interimResults?: boolean;
}

/**
 * Hook that wraps the Web Speech API for speech-to-text transcription.
 */
export function useSpeechToText(
    onTranscript: (text: string) => void,
    options: UseSpeechToTextOptions = {},
) {
    const { lang = 'zh-TW', continuous = true, interimResults = true } = options;

    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const stop = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    const start = useCallback(() => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.lang = lang;

        recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            onTranscript(transcript);
        };

        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);

        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
    }, [lang, continuous, interimResults, onTranscript]);

    const toggle = useCallback(() => {
        if (isListening) {
            stop();
        } else {
            start();
        }
    }, [isListening, start, stop]);

    return { isListening, start, stop, toggle };
}
