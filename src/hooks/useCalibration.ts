import { useCallback, useEffect, useRef, useState } from "react";
import {
  SAMPLE_INTERVAL_MS,
  SILENCE_FLOOR_DBFS,
  openMicrophone,
  percentile,
  type MicSession,
} from "../lib/audio.ts";
import {
  CALIBRATION_DURATION_MS,
  CALIBRATION_PERCENTILE,
  calibrationFromSpeech,
} from "../lib/calibration.ts";

export type CalibrationStatus = "idle" | "listening" | "done" | "error";

export function useCalibration(onCalibrated: (calibrationDb: number) => void) {
  const [status, setStatus] = useState<CalibrationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [msLeft, setMsLeft] = useState(0);
  const [result, setResult] = useState<number | null>(null);

  const sessionRef = useRef<MicSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const runningRef = useRef(false);

  const onCalibratedRef = useRef(onCalibrated);
  useEffect(() => {
    onCalibratedRef.current = onCalibrated;
  }, [onCalibrated]);

  const finish = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = undefined;
    sessionRef.current?.close();
    sessionRef.current = null;
    runningRef.current = false;
  }, []);

  useEffect(() => finish, [finish]);

  const run = useCallback(async () => {
    if (runningRef.current) {
      return;
    }

    runningRef.current = true;
    setError(null);
    setResult(null);
    setStatus("listening");
    setMsLeft(CALIBRATION_DURATION_MS);

    let session: MicSession;
    try {
      session = await openMicrophone();
    } catch {
      runningRef.current = false;
      setStatus("error");
      setError("Microphone access was denied or is unavailable.");
      return;
    }

    sessionRef.current = session;

    const readings: number[] = [];
    const startedAt = Date.now();

    timerRef.current = setInterval(() => {
      readings.push(session.readFrameDbfs());

      const elapsed = Date.now() - startedAt;
      setMsLeft(Math.max(0, CALIBRATION_DURATION_MS - elapsed));

      if (elapsed < CALIBRATION_DURATION_MS) {
        return;
      }

      finish();

      const speechDbfs = percentile(readings, CALIBRATION_PERCENTILE);

      if (speechDbfs <= SILENCE_FLOOR_DBFS) {
        setStatus("error");
        setError("Nothing was heard. Try again and speak at a normal volume.");
        return;
      }

      const calibrationDb = calibrationFromSpeech(speechDbfs);
      setResult(calibrationDb);
      onCalibratedRef.current(calibrationDb);
      setStatus("done");
    }, SAMPLE_INTERVAL_MS);
  }, [finish]);

  const cancel = useCallback(() => {
    finish();
    setStatus("idle");
    setMsLeft(0);
  }, [finish]);

  return { status, error, msLeft, result, run, cancel };
}
