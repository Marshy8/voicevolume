import { useEffect, useMemo, useRef } from "react";
import {
  CHART_CEILING_DB,
  CHART_FLOOR_DB,
  MS_PER_MINUTE,
  PANE_MINUTES,
  SNAP_MINUTES,
  ZONE_FILL,
  toDisplayDb,
  volumeZone,
  type VolumeSample,
} from "../lib/volume.ts";

interface AnalyticsModalProps {
  open: boolean;
  samples: VolumeSample[];
  calibrationDb: number;
  lowDb: number;
  medDb: number;
  onClose: () => void;
}

const PLOT_HEIGHT = 100;
const TICK_STEP_DB = 10;
const SNAP_MS = SNAP_MINUTES * MS_PER_MINUTE;

interface Timeline {
  startMs: number;
  endMs: number;
  totalMinutes: number;
  minuteDb: (number | null)[];
}

function dbToY(db: number): number {
  const span = CHART_CEILING_DB - CHART_FLOOR_DB;
  const fraction = (db - CHART_FLOOR_DB) / span;
  return PLOT_HEIGHT - Math.min(1, Math.max(0, fraction)) * PLOT_HEIGHT;
}

function floorToSnap(ms: number): number {
  return Math.floor(ms / SNAP_MS) * SNAP_MS;
}

function ceilToSnap(ms: number): number {
  return Math.ceil(ms / SNAP_MS) * SNAP_MS;
}

function buildTimeline(
  samples: VolumeSample[],
  calibrationDb: number,
): Timeline | null {
  if (samples.length === 0) {
    return null;
  }

  const startMs = floorToSnap(samples[0].timeMs);
  const lastMs = samples[samples.length - 1].timeMs;

  const lastMinuteEndMs =
    Math.floor(lastMs / MS_PER_MINUTE) * MS_PER_MINUTE + MS_PER_MINUTE;

  const endMs = Math.max(
    startMs + PANE_MINUTES * MS_PER_MINUTE,
    ceilToSnap(lastMinuteEndMs),
  );

  const totalMinutes = (endMs - startMs) / MS_PER_MINUTE;
  const totals = new Array<number>(totalMinutes).fill(0);
  const counts = new Array<number>(totalMinutes).fill(0);

  for (const sample of samples) {
    const minute = Math.floor((sample.timeMs - startMs) / MS_PER_MINUTE);
    if (minute < 0 || minute >= totalMinutes) {
      continue;
    }

    totals[minute] += toDisplayDb(sample.dbfs, calibrationDb);
    counts[minute] += 1;
  }

  const minuteDb = totals.map((total, minute) =>
    counts[minute] === 0 ? null : total / counts[minute],
  );

  return { startMs, endMs, totalMinutes, minuteDb };
}

function formatClock(ms: number): string {
  const date = new Date(ms);
  const hours = date.getHours() % 12 || 12;
  return `${hours}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatRange(startMs: number, endMs: number): string {
  const start = new Date(startMs);
  const day = start.toLocaleDateString([], { month: "short", day: "numeric" });
  const from = start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const to = new Date(endMs).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${day}, ${from} – ${to}`;
}

function AnalyticsModal({
  open,
  samples,
  calibrationDb,
  lowDb,
  medDb,
  onClose,
}: AnalyticsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();

      if (scrollRef.current) {
        scrollRef.current.scrollLeft = 0;
      }
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  const timeline = useMemo(
    () => buildTimeline(samples, calibrationDb),
    [samples, calibrationDb],
  );

  const dbTicks: number[] = [];
  for (let db = CHART_CEILING_DB; db >= CHART_FLOOR_DB; db -= TICK_STEP_DB) {
    dbTicks.push(db);
  }

  const snapCount = timeline ? timeline.totalMinutes / SNAP_MINUTES : 0;
  const snapMarks = Array.from({ length: snapCount + 1 }, (_, index) => index);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-150 max-w-[92vw] max-h-[92svh] overflow-y-auto overscroll-contain rounded-lg p-4 sm:p-6 backdrop:bg-black/50"
    >
      <h2 className="text-xl sm:text-2xl mb-1">Recording Analytics</h2>

      {timeline === null ? (
        <p className="mt-3">No volume data recorded.</p>
      ) : (
        <>
          <p className="mb-4 text-xs text-gray-400">
            {formatRange(timeline.startMs, timeline.endMs)} · one bar per minute
          </p>

          <div className="flex gap-2">
            <div className="relative h-64 sm:h-96 w-10 sm:w-12 shrink-0 text-[10px] sm:text-xs text-gray-400">
              {dbTicks.map((db) => (
                <span
                  key={db}
                  className="absolute right-1 -translate-y-1/2"
                  style={{ top: `${dbToY(db)}%` }}
                >
                  {db} dB
                </span>
              ))}
            </div>

            <div
              ref={scrollRef}
              tabIndex={0}
              role="group"
              aria-label="Volume timeline, scrolls horizontally by the hour"
              className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain outline-none focus-visible:outline-2 focus-visible:outline-blue-500"
              style={{ scrollSnapType: "x mandatory" }}
            >
              <div
                className="relative"
                style={{
                  width: `${(timeline.totalMinutes / PANE_MINUTES) * 100}%`,
                }}
              >
                <svg
                  viewBox={`0 0 ${timeline.totalMinutes} ${PLOT_HEIGHT}`}
                  preserveAspectRatio="none"
                  className="block h-64 sm:h-96 w-full"
                >
                  {dbTicks.map((db) => (
                    <line
                      key={db}
                      x1={0}
                      y1={dbToY(db)}
                      x2={timeline.totalMinutes}
                      y2={dbToY(db)}
                      stroke="#64748b"
                      strokeOpacity={0.2}
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}

                  {snapMarks.map((mark) => (
                    <line
                      key={mark}
                      x1={mark * SNAP_MINUTES}
                      y1={0}
                      x2={mark * SNAP_MINUTES}
                      y2={PLOT_HEIGHT}
                      stroke="#64748b"
                      strokeOpacity={
                        mark % (PANE_MINUTES / SNAP_MINUTES) === 0 ? 0.45 : 0.15
                      }
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}

                  {timeline.minuteDb.map((db, minute) => {
                    if (db === null) {
                      return null;
                    }

                    const y = dbToY(db);

                    return (
                      <rect
                        key={minute}
                        x={minute + 0.1}
                        y={y}
                        width={0.8}
                        height={PLOT_HEIGHT - y}
                        fill={ZONE_FILL[volumeZone(db, lowDb, medDb)]}
                      />
                    );
                  })}

                  {[lowDb, medDb].map((threshold) => (
                    <line
                      key={threshold}
                      x1={0}
                      y1={dbToY(threshold)}
                      x2={timeline.totalMinutes}
                      y2={dbToY(threshold)}
                      stroke="#64748b"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>

                <div className="relative mt-1 h-4 text-[10px] text-gray-400">
                  {snapMarks.map((mark) => {
                    const offset =
                      (mark * SNAP_MINUTES) / timeline.totalMinutes;
                    const shift =
                      mark === 0 ? "0" : mark === snapCount ? "-100%" : "-50%";

                    return (
                      <span
                        key={mark}
                        className="absolute top-0 whitespace-nowrap"
                        style={{
                          left: `${offset * 100}%`,
                          transform: `translateX(${shift})`,
                        }}
                      >
                        {formatClock(
                          timeline.startMs +
                            mark * SNAP_MINUTES * MS_PER_MINUTE,
                        )}
                      </span>
                    );
                  })}
                </div>

                <div className="pointer-events-none absolute inset-0 flex">
                  {snapMarks.slice(0, snapCount).map((mark) => (
                    <div
                      key={mark}
                      style={{
                        width: `${(SNAP_MINUTES / timeline.totalMinutes) * 100}%`,
                        scrollSnapAlign: "start",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <button
        autoFocus
        className="text-black outline rounded-md bg-red-500 hover:bg-red-300 px-6 py-3 mt-4"
        onClick={onClose}
      >
        Close
      </button>
    </dialog>
  );
}

export default AnalyticsModal;
