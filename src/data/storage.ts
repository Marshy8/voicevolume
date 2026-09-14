import type { VolumeSettings } from "../lib/volume";

export function saveSettings(settings: VolumeSettings) {
  window.localStorage.setItem("volumeSettings", JSON.stringify(settings));
}

export function loadSettings(): VolumeSettings | null {
  const settings = window.localStorage.getItem("volumeSettings");
  return settings ? JSON.parse(settings) : null;
}
