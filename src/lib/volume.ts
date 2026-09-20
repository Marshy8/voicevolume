import { loadSettings } from "../data/storage";
export const DEFAULT_CALIBRATION_DB = 94;

export const MIN_DISPLAY_DB = 0;
export const MAX_DISPLAY_DB = 120;

export const MIN_CALIBRATION_DB = 0;
export const MAX_CALIBRATION_DB = 200;

export const MIN_ZONE_GAP_DB = 1;

export const MS_PER_MINUTE = 60_000;

export const UPDATE_INTERVAL_CHOICES_MS = [
  100, 200, 250, 300, 500, 600, 750, 1000, 1500, 2000, 3000, 4000, 5000, 6000,
  10000, 12000, 15000, 20000, 30000, 60000,
];

export const MIN_UPDATE_INTERVAL_MS = UPDATE_INTERVAL_CHOICES_MS[0];
export const MAX_UPDATE_INTERVAL_MS =
  UPDATE_INTERVAL_CHOICES_MS[UPDATE_INTERVAL_CHOICES_MS.length - 1];

export const CHART_FLOOR_DB = 0;
export const CHART_CEILING_DB = 100;

export const PANE_MINUTES = 60;
export const SNAP_MINUTES = 5;

export type VolumeZone = "low" | "medium" | "high";

export interface VolumeSample {
  timeMs: number;
  dbfs: number;
}

export interface VolumeSettings {
  lowDb: number;
  medDb: number;
  updateIntervalMS: number;
  calibrationDb: number;
}

export const DEFAULT_SETTINGS: VolumeSettings = {
  lowDb: 50,
  medDb: 70,
  updateIntervalMS: 5000,
  calibrationDb: DEFAULT_CALIBRATION_DB,
};

export function normalizeIntervalMs(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SETTINGS.updateIntervalMS;
  }

  return UPDATE_INTERVAL_CHOICES_MS.reduce((best, choice) =>
    Math.abs(choice - value) < Math.abs(best - value) ? choice : best,
  );
}

const storedSettings = loadSettings();

export const SAVED_SETTINGS: VolumeSettings = storedSettings
  ? {
      ...storedSettings,
      updateIntervalMS: normalizeIntervalMs(storedSettings.updateIntervalMS),
    }
  : DEFAULT_SETTINGS;

export function toDisplayDb(dbfs: number, calibrationDb: number): number {
  return Math.max(MIN_DISPLAY_DB, dbfs + calibrationDb);
}

export function clampDisplayDb(value: number): number {
  return Math.min(MAX_DISPLAY_DB, Math.max(MIN_DISPLAY_DB, value));
}

export function volumeZone(
  db: number,
  lowDb: number,
  medDb: number,
): VolumeZone {
  if (db < lowDb) {
    return "low";
  }
  return db < medDb ? "medium" : "high";
}

export const ZONE_BG: Record<VolumeZone, string> = {
  low: "bg-green-400",
  medium: "bg-yellow-400",
  high: "bg-red-400",
};

export const ZONE_FILL: Record<VolumeZone, string> = {
  low: "#4ade80",
  medium: "#facc15",
  high: "#f87171",
};

export function displayDbPercent(db: number): number {
  return ((db - MIN_DISPLAY_DB) / (MAX_DISPLAY_DB - MIN_DISPLAY_DB)) * 100;
}

export function zoneGradientCss(lowDb: number, medDb: number): string {
  const low = displayDbPercent(lowDb);
  const med = displayDbPercent(medDb);

  return [
    "linear-gradient(to right",
    `${ZONE_FILL.low} 0 ${low}%`,
    `${ZONE_FILL.medium} ${low}% ${med}%`,
    `${ZONE_FILL.high} ${med}% 100%)`,
  ].join(", ");
}

export function withThreshold(
  settings: VolumeSettings,
  field: "lowDb" | "medDb",
  value: number,
): VolumeSettings {
  if (field === "lowDb") {
    const lowDb = Math.min(
      clampDisplayDb(value),
      MAX_DISPLAY_DB - MIN_ZONE_GAP_DB,
    );

    return {
      ...settings,
      lowDb,
      medDb: Math.max(settings.medDb, lowDb + MIN_ZONE_GAP_DB),
    };
  }

  const medDb = Math.max(
    clampDisplayDb(value),
    MIN_DISPLAY_DB + MIN_ZONE_GAP_DB,
  );

  return {
    ...settings,
    medDb,
    lowDb: Math.min(settings.lowDb, medDb - MIN_ZONE_GAP_DB),
  };
}

export function intervalIndex(ms: number): number {
  return UPDATE_INTERVAL_CHOICES_MS.indexOf(normalizeIntervalMs(ms));
}

export function formatInterval(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${ms / 1000} s`;
}
