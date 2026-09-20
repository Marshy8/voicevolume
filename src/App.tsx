import AudioRecorder from "./components/AudioRecorder.tsx";

function App() {
  return (
    <div className="min-h-svh p-4 flex justify-between flex-col gap-4">
      <label className="text-3xl sm:text-4xl">VoiceVolume</label>

      <div className="flex w-full justify-center gap-4">
        <AudioRecorder />
      </div>

      <label className="flex flex-wrap justify-center gap-x-1 gap-y-0 text-sm sm:text-base">
        <span>Built by</span>
        <a
          className="text-blue-500 hover:text-blue-300"
          href="https://github.com/Marshy8"
          target="_blank"
          rel="noopener noreferrer"
        >
          Buck Harris
        </a>
        <span>&</span>
        <a
          className="text-blue-500 hover:text-blue-300"
          href="https://github.com/justunator"
          target="_blank"
          rel="noopener noreferrer"
        >
          Justin Quan
        </a>
      </label>
    </div>
  );
}

export default App;
