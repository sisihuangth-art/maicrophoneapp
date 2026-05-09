/**
 * Real-time pitch detection using autocorrelation (YIN-inspired).
 * Works on raw PCM Float32 samples.
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export interface PitchResult {
    /** Detected frequency in Hz, or null if no clear pitch */
    frequency: number | null;
    /** MIDI note name like "A4", or null */
    note: string | null;
    /** How many cents sharp (+) or flat (-) from the nearest note */
    cents: number;
    /** Clarity/confidence 0-1 */
    clarity: number;
}

/**
 * Attempt pitch detection via autocorrelation on a buffer of PCM samples.
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): PitchResult {
    const SIZE = buffer.length;
    const NO_PITCH: PitchResult = { frequency: null, note: null, cents: 0, clarity: 0 };

    // 1. Check if signal has enough energy
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return NO_PITCH;

    // 2. Normalized square difference function (YIN step 2+3)
    const halfSize = Math.floor(SIZE / 2);
    const yinBuffer = new Float32Array(halfSize);
    yinBuffer[0] = 1;
    let runningSum = 0;

    for (let tau = 1; tau < halfSize; tau++) {
        let sum = 0;
        for (let i = 0; i < halfSize; i++) {
            const delta = buffer[i] - buffer[i + tau];
            sum += delta * delta;
        }
        yinBuffer[tau] = sum;
        runningSum += sum;
        yinBuffer[tau] *= tau / runningSum; // cumulative mean normalized
    }

    // 3. Absolute threshold – find first dip below threshold
    const threshold = 0.15;
    let tauEstimate = -1;
    for (let tau = 2; tau < halfSize; tau++) {
        if (yinBuffer[tau] < threshold) {
            // Walk to the local minimum
            while (tau + 1 < halfSize && yinBuffer[tau + 1] < yinBuffer[tau]) tau++;
            tauEstimate = tau;
            break;
        }
    }

    if (tauEstimate === -1) return NO_PITCH;

    // 4. Parabolic interpolation for sub-sample accuracy
    const s0 = yinBuffer[tauEstimate - 1] ?? yinBuffer[tauEstimate];
    const s1 = yinBuffer[tauEstimate];
    const s2 = yinBuffer[tauEstimate + 1] ?? yinBuffer[tauEstimate];
    const betterTau = tauEstimate + (s0 - s2) / (2 * (s0 - 2 * s1 + s2) || 1);

    const frequency = sampleRate / betterTau;
    const clarity = 1 - (yinBuffer[tauEstimate] ?? 1);

    // Ignore unreasonable frequencies
    if (frequency < 60 || frequency > 1500) return NO_PITCH;

    // 5. Map to note name + cents
    const midiNum = 12 * Math.log2(frequency / 440) + 69;
    const roundedMidi = Math.round(midiNum);
    const cents = Math.round((midiNum - roundedMidi) * 100);
    const noteName = NOTE_NAMES[roundedMidi % 12];
    const octave = Math.floor(roundedMidi / 12) - 1;

    return {
        frequency: Math.round(frequency * 10) / 10,
        note: `${noteName}${octave}`,
        cents,
        clarity: Math.round(clarity * 100) / 100,
    };
}
