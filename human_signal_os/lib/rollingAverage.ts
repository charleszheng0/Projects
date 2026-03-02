/**
 * Time-windowed rolling average.
 * All scores use a 3-second rolling window; fidget detection uses 5 seconds.
 */
export class RollingBuffer {
  private entries: Array<{ value: number; ts: number }> = [];
  private windowMs: number;

  constructor(windowSeconds = 3) {
    this.windowMs = windowSeconds * 1000;
  }

  push(value: number): void {
    const now = Date.now();
    this.entries.push({ value, ts: now });
    const cutoff = now - this.windowMs;
    while (this.entries.length > 0 && this.entries[0].ts < cutoff) {
      this.entries.shift();
    }
  }

  average(): number {
    if (this.entries.length === 0) return 0;
    return this.entries.reduce((s, e) => s + e.value, 0) / this.entries.length;
  }

  count(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries = [];
  }
}

/** Rolling landmark history bounded by time. Returns array of frames from the window. */
export class LandmarkHistory {
  private entries: Array<{ frame: unknown[]; ts: number }> = [];
  private windowMs: number;

  constructor(windowSeconds = 3) {
    this.windowMs = windowSeconds * 1000;
  }

  push(frame: unknown[]): void {
    const now = Date.now();
    this.entries.push({ frame, ts: now });
    const cutoff = now - this.windowMs;
    while (this.entries.length > 0 && this.entries[0].ts < cutoff) {
      this.entries.shift();
    }
  }

  frames(): unknown[][] {
    return this.entries.map(e => e.frame);
  }

  count(): number {
    return this.entries.length;
  }

  clear(): void {
    this.entries = [];
  }
}
