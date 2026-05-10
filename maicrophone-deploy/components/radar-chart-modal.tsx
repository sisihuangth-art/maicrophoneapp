'use client';

import { useRouter } from 'next/navigation';

interface Scores {
    pitch: number;
    stability: number;
    rhythm: number;
    expression: number;
    technique: number;
}

interface RadarChartModalProps {
    scores: Scores;
    onClose: () => void;
}

// 五個維度，順時針從頂部開始
const AXES = [
    { key: 'pitch',      label: '音準', max: 50 },
    { key: 'technique',  label: '技巧', max: 50 },
    { key: 'expression', label: '情感', max: 50 },
    { key: 'rhythm',     label: '節奏', max: 50 },
    { key: 'stability',  label: '氣息', max: 50 },
];

const CX = 150, CY = 150, R = 90;

function getPoint(angleDeg: number, r: number) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function RadarChart({ scores }: { scores: Scores }) {
    // 背景格線（五層）
    const gridLevels = [20, 40, 60, 80, 100];
    const gridPolygons = gridLevels.map((pct) => {
        const r = R * pct / 100;
        return AXES.map((_, i) => {
            const pt = getPoint(i * 72, r);
            return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
        }).join(' ');
    });

    // 分數多邊形
    const scorePoints = AXES.map((axis, i) => {
        const val = scores[axis.key as keyof Scores] ?? 0;
        const r = R * Math.min(val / axis.max, 1);
        const pt = getPoint(i * 72, r);
        return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');

    // 標籤位置（頂點外推 22px）
    const labelR = R + 22;
    const labels = AXES.map((axis, i) => {
        const pt = getPoint(i * 72, labelR);
        const val = scores[axis.key as keyof Scores] ?? 0;
        return { x: pt.x, y: pt.y, label: axis.label, val };
    });

    // 分數點
    const dots = AXES.map((axis, i) => {
        const val = scores[axis.key as keyof Scores] ?? 0;
        const r = R * Math.min(val / axis.max, 1);
        return getPoint(i * 72, r);
    });

    return (
        <svg viewBox="0 0 300 300" style={{ width: '240px', height: '240px' }}>
            {/* 背景格線 */}
            {gridPolygons.map((pts, i) => (
                <polygon key={i} points={pts} fill="none"
                    stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            ))}
            {/* 軸線 */}
            {AXES.map((_, i) => {
                const pt = getPoint(i * 72, R);
                return <line key={i} x1={CX} y1={CY} x2={pt.x.toFixed(1)} y2={pt.y.toFixed(1)}
                    stroke="rgba(255,255,255,0.12)" strokeWidth="1" />;
            })}
            {/* 分數填色區域 */}
            <polygon points={scorePoints}
                fill="rgba(255,45,122,0.2)"
                stroke="url(#radarGrad)" strokeWidth="2.5" strokeLinejoin="round" />
            {/* 漸層定義 */}
            <defs>
                <linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF2D7A" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
            </defs>
            {/* 頂點圓點 */}
            {dots.map((pt, i) => (
                <circle key={i} cx={pt.x.toFixed(1)} cy={pt.y.toFixed(1)} r="4.5"
                    fill="#FF2D7A" stroke="#0D0A14" strokeWidth="1.5" />
            ))}
            {/* 標籤 */}
            {labels.map((l, i) => (
                <g key={i}>
                    <text x={l.x.toFixed(1)} y={(l.y - 7).toFixed(1)}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="rgba(240,235,248,0.6)" fontSize="10.5" fontWeight="600">
                        {l.label}
                    </text>
                    <text x={l.x.toFixed(1)} y={(l.y + 8).toFixed(1)}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="#FFD93D" fontSize="11" fontWeight="800">
                        {l.val}
                    </text>
                </g>
            ))}
        </svg>
    );
}

export function RadarChartModal({ scores, onClose }: RadarChartModalProps) {
    const router = useRouter();
    const total = (scores.pitch ?? 0) + (scores.stability ?? 0) + (scores.rhythm ?? 0)
        + (scores.expression ?? 0) + (scores.technique ?? 0);

    function getTitle(t: number) {
        if (t >= 221) return '天籟之音 ✨';
        if (t >= 151) return '麥克風稱霸者 🎤';
        if (t >= 101) return 'KTV 模範生 🎵';
        if (t >= 51)  return '愛唱歌的路人 🎶';
        return '大音痴是你 😅';
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(13,10,20,0.88)',
            backdropFilter: 'blur(16px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
        }}>
            <div style={{
                width: '100%', maxWidth: '360px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '32px',
                padding: '28px 20px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                textAlign: 'center',
            }}>
                {/* 標題 */}
                <div>
                    <p style={{ fontSize: '26px', marginBottom: '6px' }}>🏆</p>
                    <h2 style={{
                        fontSize: '17px', fontWeight: 800, marginBottom: '4px',
                        background: 'linear-gradient(135deg, #FF2D7A, #FFD93D)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        恭喜！你已完成所有挑戰
                    </h2>
                    <p style={{ fontSize: '12px', color: 'rgba(240,235,248,0.45)' }}>
                        以下是你的歌唱天賦雷達
                    </p>
                </div>

                {/* 雷達圖 */}
                <RadarChart scores={scores} />

                {/* 總分 */}
                <div style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)',
                    borderRadius: '16px', padding: '12px 16px',
                }}>
                    <p style={{ fontSize: '11px', color: 'rgba(240,235,248,0.35)', marginBottom: '2px' }}>
                        總分
                    </p>
                    <p style={{
                        fontSize: '30px', fontWeight: 900, lineHeight: 1.1,
                        background: 'linear-gradient(135deg, #FF2D7A, #8B5CF6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        {total}
                        <span style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.25)', WebkitTextFillColor: 'rgba(255,255,255,0.25)' }}> / 250</span>
                    </p>
                    <p style={{ fontSize: '12px', color: '#FFD93D', fontWeight: 700, marginTop: '2px' }}>
                        {getTitle(total)}
                    </p>
                </div>

                {/* 按鈕 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <button
                        onClick={() => router.push('/leaderboard')}
                        style={{
                            width: '100%', padding: '13px',
                            borderRadius: '16px', fontWeight: 700, fontSize: '14px',
                            background: 'linear-gradient(135deg, #FF2D7A, #8B5CF6)',
                            color: 'white', border: 'none', cursor: 'pointer',
                        }}
                    >
                        🌟 前往星光大道
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '13px',
                            borderRadius: '16px', fontWeight: 600, fontSize: '13px',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(240,235,248,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                        }}
                    >
                        繼續練習
                    </button>
                </div>
            </div>
        </div>
    );
}
