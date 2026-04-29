/**
 * SonikaClean — AI-powered noise reduction.
 *
 * PROTOTYPE: simulates processing state. In production integrate RNNoise
 * (https://jmvalin.ca/demo/rnnoise) compiled to native or use a Core ML /
 * TensorFlow Lite model for real-time spectral subtraction.
 */

type ProcessingStateCallback = (isProcessing: boolean) => void;

class SonikaCleanService {
  private active = false;
  private callbacks: ProcessingStateCallback[] = [];

  enable(): void {
    this.active = true;
    this.notify(true);
  }

  disable(): void {
    this.active = false;
    this.notify(false);
  }

  isActive(): boolean {
    return this.active;
  }

  onProcessingStateChanged(cb: ProcessingStateCallback): () => void {
    this.callbacks.push(cb);
    return () => {
      this.callbacks = this.callbacks.filter((c) => c !== cb);
    };
  }

  private notify(state: boolean): void {
    this.callbacks.forEach((cb) => cb(state));
  }
}

export const sonikaClean = new SonikaCleanService();
