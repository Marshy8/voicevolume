import { useState } from "react";
import LiveAnalysis from "./LiveAnalysis.tsx";
import AnalyticsModal from "./AnalyticsModal.tsx";
import SettingsButton from "./SettingsButton.tsx";
import { useAudioAnalyser } from "../hooks/useAudioAnalyser.ts";
import {
  DEFAULT_SETTINGS,
  SAVED_SETTINGS,
  toDisplayDb,
  type VolumeSettings,
} from "../lib/volume.ts";

function AudioRecorder() {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [settings, setSettings] = useState<VolumeSettings>(
    SAVED_SETTINGS || DEFAULT_SETTINGS,
  );

  const { recording, error, currentDbfs, historySamples, start, stop } =
    useAudioAnalyser({ windowMs: settings.updateIntervalMS });

  const currentDb =
    currentDbfs === null
      ? null
      : toDisplayDb(currentDbfs, settings.calibrationDb);

  function handleStop() {
    stop();
    setShowAnalytics(true);
  }

  return (
    <div className='w-full max-w-128'>
      <LiveAnalysis
        currentDb={currentDb}
        lowDb={settings.lowDb}
        medDb={settings.medDb}
      />

      {error === null ? null : (
        <p className='pt-2 text-red-500' role='alert'>
          {error}
        </p>
      )}

      <div className='grid grid-cols-3 items-center gap-2 pt-4'>
        <button
          className={`justify-self-start text-black outline rounded-md px-4 py-3 disabled:opacity-50 ${
            recording
              ? "bg-red-500 hover:bg-red-300"
              : "bg-green-500 hover:bg-green-300"
          }`}
          onClick={recording ? handleStop : start}
        >
          {recording ? "Stop" : "Start"}
        </button>

        <div className='flex justify-center'>
          <SettingsButton values={settings} onChange={setSettings} />
        </div>

        <button
          className='justify-self-end text-black outline rounded-md px-4 py-3 bg-blue-500 hover:bg-blue-300'
          onClick={() => setShowAnalytics(true)}
        >
          Analytics
        </button>
      </div>

      <AnalyticsModal
        open={showAnalytics}
        samples={historySamples}
        calibrationDb={settings.calibrationDb}
        lowDb={settings.lowDb}
        medDb={settings.medDb}
        onClose={() => setShowAnalytics(false)}
      />
    </div>
  );
}

export default AudioRecorder;
