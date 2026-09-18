export const SAMPLE_INTERVAL_MS = 50;

export const SILENCE_FLOOR_DBFS = -65;

const MIN_AMPLITUDE = 1e-5;

export function toDbfs(amplitude: number): number {
  return 20 * Math.log10(Math.max(amplitude, MIN_AMPLITUDE));
}

export interface MicSession {
  readFrameDbfs: () => number;
  close: () => void;
}

export async function openMicrophone(): Promise<MicSession> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const context = new AudioContext();
  await context.resume();

  const analyser = context.createAnalyser();
  context.createMediaStreamSource(stream).connect(analyser);
  const buffer = new Float32Array(analyser.fftSize);

  return {
    readFrameDbfs() {
      analyser.getFloatTimeDomainData(buffer);

      let sumOfSquares = 0;
      for (const sample of buffer) {
        sumOfSquares += sample * sample;
      }

      return toDbfs(Math.sqrt(sumOfSquares / buffer.length));
    },

    close() {
      stream.getTracks().forEach((track) => track.stop());
      if (context.state !== "closed") {
        void context.close();
      }
    },
  };
}

export function percentile(readings: number[], fraction: number): number {
  if (readings.length === 0) {
    return SILENCE_FLOOR_DBFS;
  }

  const sorted = [...readings].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.floor(sorted.length * fraction),
  );

  return sorted[index];
}

export function median(readings: number[]): number {
  return percentile(readings, 0.5);
}
