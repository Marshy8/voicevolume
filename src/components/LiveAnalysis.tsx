import { ZONE_BG, volumeZone } from "../lib/volume.ts";

interface LiveAnalysisProps {
  currentDb: number | null;
  lowDb: number;
  medDb: number;
}

function LiveAnalysis({ currentDb, lowDb, medDb }: LiveAnalysisProps) {
  const zoneClass =
    currentDb === null ? "" : ZONE_BG[volumeZone(currentDb, lowDb, medDb)];

  return (
    <div className="w-full justify-center gap-3 sm:gap-4 flex flex-col items-center">
      <span className="text-xl sm:text-2xl font-bold">
        Volume: {currentDb === null ? "N/A" : currentDb.toFixed(0)} dB
      </span>

      <div
        className={`box-border aspect-square w-[min(32rem,100%,calc(100svh-16rem))] rounded-lg border-4 p-4 transition-colors duration-500 ${zoneClass}`}
      />
    </div>
  );
}

export default LiveAnalysis;
