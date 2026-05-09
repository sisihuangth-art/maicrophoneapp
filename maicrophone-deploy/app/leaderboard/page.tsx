'use client';

import { ArrowLeft, Crown, Medal, Trophy, Waves } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';

const TABS = [
    { key: 'total', label: '總分' },
    { key: 'pitch', label: '音準' },
    { key: 'stability', label: '氣息' },
    { key: 'rhythm', label: '節奏' },
    { key: 'expression', label: '情感' },
    { key: 'technique', label: '技巧' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    title: string;
    scores: {
        rhythm: number;
        expression: number;
        technique: number;
        stability: number;
        pitch: number;
    };
    total: number;
}

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-zinc-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm font-bold text-zinc-500">{rank}</span>;
}

export default function LeaderboardPage() {
    const user = useAuth();
    const [tab, setTab] = useState<TabKey>('total');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/leaderboard?type=${tab}&limit=50`)
            .then((r) => r.json())
            .then((data) => setEntries(data.entries ?? []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [tab]);

    if (!user) return null;

    const displayScore = (entry: LeaderboardEntry) =>
        tab === 'total' ? entry.total : entry.scores[tab as keyof LeaderboardEntry['scores']];

    return (
        <main className="min-h-screen bg-zinc-950 text-white font-sans p-6 relative">
            {/* Background gradient */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto">
                {/* Header */}
                <header className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="p-2 rounded-xl border border-zinc-800 hover:border-zinc-600 transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-zinc-400" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
                                <Waves className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-amber-400" />
                                    超級星光大道
                                </h1>
                                <p className="text-xs text-zinc-500">分數排行榜</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${tab === t.key
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Leaderboard */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[3rem_1fr_4rem] sm:grid-cols-[3rem_1fr_4rem_4rem_4rem_4rem_4rem_4rem] gap-1 px-4 py-3 border-b border-zinc-800 text-xs text-zinc-500 font-medium">
                        <span>#</span>
                        <span>玩家</span>
                        <span className="text-right">
                            {tab === 'total' ? '總分' : TABS.find((t) => t.key === tab)?.label}
                        </span>
                        <span className="text-right hidden sm:block">音準</span>
                        <span className="text-right hidden sm:block">氣息</span>
                        <span className="text-right hidden sm:block">節奏</span>
                        <span className="text-right hidden sm:block">情感</span>
                        <span className="text-right hidden sm:block">技巧</span>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center text-zinc-500 text-sm">載入中…</div>
                    ) : entries.length === 0 ? (
                        <div className="py-16 text-center text-zinc-500 text-sm">目前沒有資料</div>
                    ) : (
                        entries.map((entry) => {
                            const isMe = entry.userId === user.userId;
                            return (
                                <div
                                    key={entry.userId}
                                    className={`grid grid-cols-[3rem_1fr_4rem] sm:grid-cols-[3rem_1fr_4rem_4rem_4rem_4rem_4rem_4rem] gap-1 px-4 py-3 border-b border-zinc-800/50 last:border-0 items-center transition ${isMe ? 'bg-indigo-500/10' : 'hover:bg-zinc-800/40'
                                        }`}
                                >
                                    <div className="flex items-center justify-center">
                                        <RankBadge rank={entry.rank} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-semibold truncate ${isMe ? 'text-indigo-300' : ''}`}>
                                            {entry.username}
                                            {isMe && <span className="ml-1 text-xs text-indigo-400">(你)</span>}
                                        </p>
                                        <p className="text-xs text-zinc-500 truncate">{entry.title}</p>
                                    </div>
                                    <span className="text-right text-sm font-bold text-amber-400">
                                        {displayScore(entry)}
                                    </span>
                                    <span className="text-right text-sm text-zinc-400 hidden sm:block">{entry.scores.pitch}</span>
                                    <span className="text-right text-sm text-zinc-400 hidden sm:block">{entry.scores.stability}</span>
                                    <span className="text-right text-sm text-zinc-400 hidden sm:block">{entry.scores.rhythm}</span>
                                    <span className="text-right text-sm text-zinc-400 hidden sm:block">{entry.scores.expression}</span>
                                    <span className="text-right text-sm text-zinc-400 hidden sm:block">{entry.scores.technique}</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </main>
    );
}
