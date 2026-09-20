import { MAX_CALIBRATION_DB, MIN_CALIBRATION_DB } from "./volume.ts";

export const CALIBRATION_REFERENCE_DB = 60;

export const CALIBRATION_DURATION_MS = 4000;

export const CALIBRATION_PERCENTILE = 0.75;

export function calibrationFromSpeech(
  speechDbfs: number,
  referenceDb: number = CALIBRATION_REFERENCE_DB,
): number {
  const suggested = referenceDb - speechDbfs;

  return Math.round(
    Math.min(MAX_CALIBRATION_DB, Math.max(MIN_CALIBRATION_DB, suggested)),
  );
}
