import { useId, useState, type CSSProperties } from "react";
import {
  DEFAULT_SETTINGS,
  MAX_CALIBRATION_DB,
  MAX_DISPLAY_DB,
  MIN_CALIBRATION_DB,
  MIN_DISPLAY_DB,
  UPDATE_INTERVAL_CHOICES_MS,
  ZONE_FILL,
  formatInterval,
  intervalIndex,
  withThreshold,
  zoneGradientCss,
  type VolumeSettings,
} from "../lib/volume.ts";
import {
  CALIBRATION_DURATION_MS,
  CALIBRATION_REFERENCE_DB,
} from "../lib/calibration.ts";
import { useCalibration } from "../hooks/useCalibration.ts";

import { saveSettings } from "../data/storage.ts";

interface SettingsButtonProps {
  values: VolumeSettings;
  onChange: (values: VolumeSettings) => void;
}

function fillTrack(percent: number): string {
  return `linear-gradient(to right, var(--accent) 0 ${percent}%, var(--border) ${percent}% 100%)`;
}

interface SliderFieldProps {
  label: string;
  valueLabel: string;
  hint: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  track: string;
  thumb?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function SliderField({
  label,
  valueLabel,
  hint,
  min,
  max,
  step = 1,
  value,
  track,
  thumb,
  disabled,
  onChange,
}: SliderFieldProps) {
  const [hintVisible, setHintVisible] = useState(false);
  const inputId = useId();

  return (
    <div className='space-y-1'>
      <div className='flex items-center gap-2 text-sm'>
        <label htmlFor={inputId} className='min-w-0 flex-1 text-left'>
          {label}
        </label>

        <span className='tabular-nums text-right'>{valueLabel}</span>

        <button
          type='button'
          aria-label={`Explain ${label}`}
          aria-expanded={hintVisible}
          className='shrink-0 outline rounded-md px-2 text-black bg-blue-500 hover:bg-blue-300'
          onClick={() => setHintVisible((previous) => !previous)}
        >
          ?
        </button>
      </div>

      <input
        id={inputId}
        type='range'
        className='zone-slider'
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--track": track, "--thumb": thumb } as CSSProperties}
      />

      {hintVisible ? (
        <p className='text-left text-xs text-gray-500'>{hint}</p>
      ) : null}
    </div>
  );
}

export default function SettingsButton({
  values,
  onChange,
}: SettingsButtonProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Edits stay in this draft while the panel is open, so a live recording is
  // untouched until Save & Close is pressed.
  const [draft, setDraft] = useState(values);

  const calibration = useCalibration((calibrationDb) =>
    setDraft((previous) => ({ ...previous, calibrationDb })),
  );

  const listening = calibration.status === "listening";
  const zoneTrack = zoneGradientCss(draft.lowDb, draft.medDb);

  function handleOpen() {
    setDraft(values);
    setIsSettingsOpen(true);
  }

  function handleClose(save: boolean) {
    calibration.cancel();

    if (save) {
      onChange(draft);
      saveSettings(draft);
    }

    setIsSettingsOpen(false);
  }

  const calibrationMessage = (() => {
    switch (calibration.status) {
      case "listening":
        return `Keep talking normally… ${Math.ceil(calibration.msLeft / 1000)}s`;
      case "done":
        return `Set to ${calibration.result} dB from your speech.`;
      case "error":
        return calibration.error;
      default:
        return `Speak normally for ${CALIBRATION_DURATION_MS / 1000}s and this is set for you.`;
    }
  })();

  return (
    <div>
      <button
        type='button'
        aria-label={isSettingsOpen ? "Close settings" : "Open settings"}
        aria-expanded={isSettingsOpen}
        aria-controls='settings-panel'
        onClick={handleOpen}
        className='inline-flex items-center justify-center rounded-lg p-2 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          className='h-5 w-5'
          aria-hidden='true'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
          />
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
          />
        </svg>
      </button>

      {isSettingsOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4'>
          <aside
            id='settings-panel'
            role='dialog'
            aria-modal='true'
            aria-label='Settings'
            className='max-h-[92svh] w-full max-w-md overflow-y-auto overscroll-contain rounded-xl bg-gray-900 p-4 shadow-xl sm:p-6'
          >
            <div className='flex items-center justify-between'>
              <h2 className='text-xl font-semibold'>Settings</h2>

              <button
                type='button'
                onClick={() => handleClose(false)}
                aria-label='Discard changes and close settings'
                className='rounded-lg p-2 text-gray-500 hover:bg-red-400 hover:text-black'
              >
                ×
              </button>
            </div>

            <div className='mt-4 space-y-5 sm:mt-6'>
              <SliderField
                label='Quiet up to'
                valueLabel={`${draft.lowDb} dB`}
                hint={`Volumes below this show green. Roughly ${MIN_DISPLAY_DB}-${MAX_DISPLAY_DB}; a quiet room is near 40 dB. Pushing this past the medium limit carries that limit along with it.`}
                min={MIN_DISPLAY_DB}
                max={MAX_DISPLAY_DB}
                value={draft.lowDb}
                track={zoneTrack}
                thumb={ZONE_FILL.low}
                onChange={(value) =>
                  setDraft((previous) => withThreshold(previous, "lowDb", value))
                }
              />

              <SliderField
                label='Medium up to'
                valueLabel={`${draft.medDb} dB`}
                hint='Volumes below this show yellow and above it show red. Conversation is near 60 dB, a shout near 85 dB. Pulling this below the quiet limit carries that limit along with it.'
                min={MIN_DISPLAY_DB}
                max={MAX_DISPLAY_DB}
                value={draft.medDb}
                track={zoneTrack}
                thumb={ZONE_FILL.medium}
                onChange={(value) =>
                  setDraft((previous) => withThreshold(previous, "medDb", value))
                }
              />

              <SliderField
                label='Update interval'
                valueLabel={formatInterval(draft.updateIntervalMS)}
                hint='How long volume is averaged before the live reading updates. Only values that divide evenly into a minute are offered, so each minute on the analytics chart is built from whole readings.'
                min={0}
                max={UPDATE_INTERVAL_CHOICES_MS.length - 1}
                value={intervalIndex(draft.updateIntervalMS)}
                track={fillTrack(
                  (intervalIndex(draft.updateIntervalMS) /
                    (UPDATE_INTERVAL_CHOICES_MS.length - 1)) *
                    100,
                )}
                onChange={(index) =>
                  setDraft((previous) => ({
                    ...previous,
                    updateIntervalMS: UPDATE_INTERVAL_CHOICES_MS[index],
                  }))
                }
              />

              <div className='space-y-2'>
                <SliderField
                  label='Microphone calibration'
                  valueLabel={`${draft.calibrationDb} dB`}
                  hint={`Browsers cannot measure true sound pressure, so readings are estimated. If a known sound reads too low, raise this; too high, lower it. Auto-calibrate assumes your normal speaking voice is ${CALIBRATION_REFERENCE_DB} dB.`}
                  min={MIN_CALIBRATION_DB}
                  max={MAX_CALIBRATION_DB}
                  value={draft.calibrationDb}
                  disabled={listening}
                  track={fillTrack(
                    ((draft.calibrationDb - MIN_CALIBRATION_DB) /
                      (MAX_CALIBRATION_DB - MIN_CALIBRATION_DB)) *
                      100,
                  )}
                  onChange={(calibrationDb) =>
                    setDraft((previous) => ({ ...previous, calibrationDb }))
                  }
                />

                <div className='flex flex-wrap items-center gap-3'>
                  <button
                    type='button'
                    disabled={listening}
                    onClick={() => void calibration.run()}
                    className='shrink-0 outline rounded-md px-3 py-1 text-sm text-black bg-gray-100 hover:bg-green-300 disabled:opacity-60'
                  >
                    {listening ? "Listening…" : "Auto-calibrate"}
                  </button>

                  <p
                    className={`min-w-40 flex-1 text-left text-xs ${
                      calibration.status === "error"
                        ? "text-red-400"
                        : "text-gray-500"
                    }`}
                    role={calibration.status === "error" ? "alert" : undefined}
                  >
                    {calibrationMessage}
                  </p>
                </div>
              </div>

              <div className='flex flex-wrap justify-center gap-2'>
                <button
                  type='button'
                  className='outline rounded-md p-2 text-black bg-gray-100 hover:bg-blue-300'
                  onClick={() => setDraft(DEFAULT_SETTINGS)}
                >
                  Reset to Defaults
                </button>

                <button
                  type='button'
                  className='outline rounded-md p-2 text-black bg-gray-100 hover:bg-green-300'
                  onClick={() => handleClose(true)}
                >
                  Save & Close
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
