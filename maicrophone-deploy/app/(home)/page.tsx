'use client';

import { LogOut, Mic2, Music, Trophy, Waves, Wind } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { logout } from '@/lib/auth';

interface UserProfile {
    username: string;
    title: string;
    scores: {
        rhythm: number;
        expression: number;
        technique: number;
        stability: number;
        pitch: number;
    };
}

function getTitle(total: number): string {
    if (total >= 221) return '天籟之音';
    if (total >= 151) return '麥克風稱霸者';
    if (total >= 101) return 'KTV模範生';
    if (total >= 51) return '愛唱歌的路人';
    return '大音痴是你';
}

const challenges = [
    {
        title: '魔法少女Do Re Mi',
        subtitle: '音準挑戰',
        icon: Music,
        href: '/challenge/pitchmatching',
        color: 'from-pink-500 to-rose-600',
    },
    {
        title: '一口氣到底',
        subtitle: '氣息控制挑戰',
        icon: Wind,
        href: '/challenge/longtone',
        color: 'from-cyan-500 to-blue-600',
    },
    {
        title: 'K哥之王',
        subtitle: '歌曲挑戰',
        icon: Mic2,
        href: '/challenge/karaoke',
        color: 'from-indigo-500 to-purple-600',
    },
    {
        title: '超級星光大道',
        subtitle: '查看分數排行榜',
        icon: Trophy,
        href: '/leaderboard',
        color: 'from-amber-500 to-orange-600',
    },
];

export default function HomePage() {
    const user = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (!user) return;
        fetch(`/api/users/${user.userId}`)
            .then((res) => res.json())
            .then((data) => {
                if (data.userId) setProfile(data);
            })
            .catch(console.error);
    }, [user]);

    if (!user) return null;

    const scores = profile?.scores;
    const total = scores
        ? scores.rhythm + scores.expression + scores.technique + scores.stability + scores.pitch
        : 0;
    const title = profile?.title || getTitle(total);

    return (
        <main className="min-h-screen bg-zinc-950 text-white font-sans p-6 relative">
            {/* Background gradient */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto">
                {/* Header */}
                <header className="flex items-start justify-between mb-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl">
                            <Waves className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Maicrophone</h1>
                            <p className="text-xs text-zinc-500">你的 AI 互動式聲唱教練</p>
                        </div>
                    </div>

                    {/* User info & logout */}
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-semibold">{profile?.username ?? user.username}</p>
                            <p className="text-xs text-indigo-400">{title}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            登出
                        </button>
                    </div>
                </header>

                {/* Scores summary */}
                {scores && (
                    <div className="mb-8 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-zinc-300">歷史最高分</h2>
                            <span className="text-sm font-bold text-indigo-400">總分 {total} / 250</span>
                        </div>
                        <div className="grid grid-cols-5 gap-3 text-center">
                            {[
                                { label: '音準', value: scores.pitch },
                                { label: '氣息', value: scores.stability },
                                { label: '節奏', value: scores.rhythm },
                                { label: '情感', value: scores.expression },
                                { label: '技巧', value: scores.technique },
                            ].map((s) => (
                                <div key={s.label}>
                                    <p className="text-lg font-bold">{s.value}</p>
                                    <p className="text-xs text-zinc-500">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Challenge cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {challenges.map((c) => (
                        <Link
                            key={c.title}
                            href={c.href}
                            className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 hover:border-zinc-600 transition-all hover:scale-[1.02]"
                        >
                            <div
                                className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${c.color} transition-opacity`}
                            />
                            <div className="relative z-10 flex items-start gap-4">
                                <div
                                    className={`p-3 rounded-xl bg-gradient-to-br ${c.color} shadow-lg`}
                                >
                                    <c.icon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">{c.title}</h3>
                                    <p className="text-sm text-zinc-400">{c.subtitle}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
