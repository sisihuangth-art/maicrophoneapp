/**
 * AudioWorkletProcessor that captures raw PCM samples and forwards them
 * to the main thread via MessagePort.
 */
class PCMRecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._stopped = false;
        this.port.onmessage = (e) => {
            if (e.data === 'stop') this._stopped = true;
        };
    }

    process(inputs, outputs) {
        if (this._stopped) return false;

        const input = inputs[0];
        if (input && input[0] && input[0].length > 0) {
            // Send a copy of the Float32 samples to the main thread
            this.port.postMessage(new Float32Array(input[0]));
        }

        // Output silence so the mic audio doesn't play through speakers
        for (const output of outputs) {
            for (const channel of output) {
                channel.fill(0);
            }
        }
        return true;
    }
}

registerProcessor('pcm-recorder-processor', PCMRecorderProcessor);
