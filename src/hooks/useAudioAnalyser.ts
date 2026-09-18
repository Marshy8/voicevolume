import { useCallback, useEffect, useRef, useState } from "react";
import {
  SAMPLE_INTERVAL_MS,
  SILENCE_FLOOR_DBFS,
  median,
  openMicrophone,
  type MicSession,
} from "../lib/audio.ts";
import type { VolumeSample } from "../lib/volume.ts";

export interface AudioAnalyserOptions {
  windowMs: number;
}

function trimLeadingSilence(samples: VolumeSample[]): VolumeSample[] {
  const firstLoud = samples.findIndex(
    (sample) => sample.dbfs > SILENCE_FLOOR_DBFS,
  );
  return firstLoud === -1 ? samples : samples.slice(firstLoud);
}

// Readings are bucketed by wall-clock time rather than by elapsed time since
// the recording started, so a window always covers the same absolute slice of
// the clock no matter when Start was pressed.
function windowStartFor(nowMs: number, windowMs: number): number {
  return Math.floor(nowMs / windowMs) * windowMs;
}

export function useAudioAnalyser({ windowMs }: AudioAnalyserOptions) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDbfs, setCurrentDbfs] = useState<number | null>(null);
  const [historySamples, setHistorySamples] = useState<VolumeSample[]>([]);

  const options = useRef({ windowMs });
  useEffect(() => {
    options.current = { windowMs };
  }, [windowMs]);

  const collected = useRef<VolumeSample[]>([]);

  const start = useCallback(() => {
    setError(null);
    setHistorySamples([]);
    collected.current = [];
    setRecording(true);
  }, []);

  const stop = useCallback(() => {
    setHistorySamples(trimLeadingSilence(collected.current));
    setCurrentDbfs(null);
    setRecording(false);
  }, []);

  useEffect(() => {
    if (!recording) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let session: MicSession | undefined;

    async function run() {
      let opened: MicSession;
      try {
        opened = await openMicrophone();
      } catch {
        if (!cancelled) {
          setError("Microphone access was denied or is unavailable.");
          setRecording(false);
        }
        return;
      }

      if (cancelled) {
        opened.close();
        return;
      }

      session = opened;

      let readings: number[] = [];
      let openWindowMs = windowStartFor(Date.now(), options.current.windowMs);

      timer = setInterval(() => {
        const windowStart = windowStartFor(
          Date.now(),
          options.current.windowMs,
        );

        if (windowStart !== openWindowMs) {
          if (readings.length > 0) {
            const level = median(readings);
            setCurrentDbfs(level);
            collected.current.push({ timeMs: openWindowMs, dbfs: level });
          }

          readings = [];
          openWindowMs = windowStart;
        }

        readings.push(opened.readFrameDbfs());
      }, SAMPLE_INTERVAL_MS);
    }

    void run();

    return () => {
      cancelled = true;
      clearInterval(timer);
      session?.close();
    };
  }, [recording]);

  return {
    recording,
    error,
    currentDbfs,
    historySamples,
    windowMs,
    start,
    stop,
  };
}
