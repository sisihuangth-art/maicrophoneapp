'use client';

import type { MeydaFeatures } from '@/hooks/use-meyda';

interface LongtoneVisualizerProps {
    features: MeydaFeatures | null;
    rmsHistory: number[];
    isRecording: boolean;
    recordingTime: number;
    targetNote: string | null;
}

function qualityColor(spectralFlatness: number): { bg: string; label: string; color: string } {
    if (spectralFlatness < 0.2) return { bg: 'bg-green-500', label: '乾淨', color: 'text-green-400' };
    if (spectralFlatness < 0.35) return { bg: 'bg-yellow-500', label: '尚可', color: 'text-yellow-400' };
    return { bg: 'bg-red-500', label: '氣音重', color: 'text-red-400' };
}

function PitchIndicator({ centsOff, frequency }: { centsOff: number; frequency: number | null }) {
    if (!frequency) {
        return (
            <div className="flex flex-col items-center gap-1">
                <div className="text-xs text-zinc-500">音高</div>
                <div className="text-zinc-600 text-sm">—</div>
            </div>
        );
    }

    const clampedCents = Math.max(-50, Math.min(50, centsOff));
    const position = ((clampedCents + 50) / 100) * 100; // 0-100%

    return (
        <div className="flex flex-col items-center gap-1 min-w-[120px]">
            <div className="text-xs text-zinc-500">音高偏移</div>
            <div className="relative w-full h-6 bg-zinc-800 rounded-full overflow-hidden">
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-600" />
                {/* Indicator dot */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-100"
                    style={{
                        left: `${position}%`,
                        transform: `translate(-50%, -50%)`,
                        backgroundColor: Math.abs(centsOff) < 10 ? '#4ade80' : Math.abs(centsOff) < 25 ? '#facc15' : '#f87171',
                    }}
                />
            </div>
            <div className="flex justify-between w-full text-[10px] text-zinc-600">
                <span>偏低</span>
                <span className={Math.abs(centsOff) < 10 ? 'text-green-400 font-bold' : ''}>
                    {centsOff > 0 ? '+' : ''}{centsOff}¢
                </span>
                <span>偏高</span>
            </div>
        </div>
    );
}

function RMSChart({ rmsHistory }: { rmsHistory: number[] }) {
    if (rmsHistory.length < 2) return null;

    const maxRms = Math.max(...rmsHistory, 0.01);
    const width = 200;
    const height = 40;
    const points = rmsHistory.map((v, i) => {
        const x = (i / (rmsHistory.length - 1)) * width;
        const y = height - (v / maxRms) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="text-xs text-zinc-500">音量曲線</div>
            <svg width={width} height={height} className="bg-zinc-800/50 rounded-lg">
                <polyline
                    points={points}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}

export function LongtoneVisualizer({ features, rmsHistory, isRecording, recordingTime, targetNote }: LongtoneVisualizerProps) {
    if (!isRecording) return null;

    const quality = features ? qualityColor(features.spectralFlatness) : null;

    return (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-20 bg-zinc-900/95 border border-zinc-700 rounded-2xl px-6 py-4 backdrop-blur-lg shadow-2xl flex flex-wrap items-center justify-center gap-6 max-w-lg">
            {/* Timer */}
            <div className="flex flex-col items-center gap-1">
                <div className="text-xs text-zinc-500">持續時間</div>
                <div className="text-2xl font-mono font-bold text-white tabular-nums">
                    {recordingTime}s
                </div>
            </div>

            {/* Target note */}
            {targetNote && (
                <div className="flex flex-col items-center gap-1">
                    <div className="text-xs text-zinc-500">目標音</div>
                    <div className="text-lg font-bold text-emerald-400">{targetNote}</div>
                </div>
            )}

            {/* Pitch indicator */}
            <PitchIndicator
                centsOff={features?.centsOff ?? 0}
                frequency={features?.frequency ?? null}
            />

            {/* Breath quality light */}
            <div className="flex flex-col items-center gap-1">
                <div className="text-xs text-zinc-500">氣息品質</div>
                {quality ? (
                    <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${quality.bg} animate-pulse`} />
                        <span className={`text-sm font-medium ${quality.color}`}>{quality.label}</span>
                    </div>
                ) : (
                    <div className="text-zinc-600 text-sm">—</div>
                )}
            </div>

            {/* RMS chart */}
            <RMSChart rmsHistory={rmsHistory} />
        </div>
    );
}
