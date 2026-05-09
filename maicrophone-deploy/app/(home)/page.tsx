'use client';

import { LogOut, Mic2, Music, Trophy, Wind } from 'lucide-react';
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
        title: '魔法少女 Do Re Mi',
        subtitle: '音準挑戰',
        icon: Music,
        href: '/challenge/pitchmatching',
        accent: '#FF2D7A',
        glow: 'rgba(255,45,122,0.15)',
    },
    {
        title: '一口氣到底',
        subtitle: '氣息控制挑戰',
        icon: Wind,
        href: '/challenge/longtone',
        accent: '#06D6A0',
        glow: 'rgba(6,214,160,0.15)',
    },
    {
        title: 'K哥之王',
        subtitle: '歌曲挑戰',
        icon: Mic2,
        href: '/challenge/karaoke',
        accent: '#FFD93D',
        glow: 'rgba(255,217,61,0.15)',
    },
    {
        title: '超級星光大道',
        subtitle: '查看分數排行榜',
        icon: Trophy,
        href: '/leaderboard',
        accent: '#8B5CF6',
        glow: 'rgba(139,92,246,0.15)',
    },
];

const scoreColors = ['#FF2D7A', '#06D6A0', '#FFD93D', '#8B5CF6', '#06D6A0'];

export default function HomePage() {
    const user = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (!user) return;
        fetch(`/api/users/${user.userId}`)
            .then((res) => res.json())
            .then((data) => { if (data.userId) setProfile(data); })
            .catch(console.error);
    }, [user]);

    if (!user) return null;

    const scores = profile?.scores;
    const total = scores
        ? scores.rhythm + scores.expression + scores.technique + scores.stability + scores.pitch
        : 0;
    const title = profile?.title || getTitle(total);

    return (
        <main className="min-h-screen text-white p-5 relative overflow-hidden" style={{ backgroundColor: '#0D0A14' }}>
            {/* Background glows */}
            <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,45,122,0.1) 0%, transparent 70%)' }} />

            <div className="relative z-10 max-w-2xl mx-auto">
                {/* Header */}
                <header className="flex items-start justify-between mb-8 pt-2">
                    <div>
                        <h1
                            className="text-2xl font-extrabold"
                            style={{
                                fontFamily: "'Bricolage Grotesque', sans-serif",
                                background: 'linear-gradient(135deg, #FF2D7A, #8B5CF6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Maicrophone
                        </h1>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(240,235,248,0.4)' }}>歌唱力養成森林</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-white">{profile?.username ?? user.username}</p>
                            <p className="text-xs" style={{ color: '#FFD93D' }}>{title}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs transition"
                            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(240,235,248,0.5)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(240,235,248,0.5)')}
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            登出
                        </button>
                    </div>
                </header>

                {/* Scores */}
                {scores && (
                    <div className="mb-6 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs font-semibold" style={{ color: 'rgba(240,235,248,0.5)' }}>歷史最高分</h2>
                            <span className="text-sm font-bold" style={{ color: '#8B5CF6' }}>總分 {total} / 250</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2 text-center">
                            {[
                                { label: '音準', value: scores.pitch },
                                { label: '氣息', value: scores.stability },
                                { label: '節奏', value: scores.rhythm },
                                { label: '情感', value: scores.expression },
                                { label: '技巧', value: scores.technique },
                            ].map((s, i) => (
                                <div key={s.label}>
                                    <p className="text-xl font-bold" style={{ color: scoreColors[i] }}>{s.value}</p>
                                    <p className="text-xs" style={{ color: 'rgba(240,235,248,0.4)' }}>{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Challenge cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {challenges.map((c) => (
                        <Link
                            key={c.title}
                            href={c.href}
                            className="group relative overflow-hidden rounded-2xl p-5 flex items-center gap-4 transition-all hover:scale-[1.02]"
                            style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: `1px solid rgba(255,255,255,0.08)`,
                                borderLeft: `3px solid ${c.accent}`,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = c.glow;
                                e.currentTarget.style.borderColor = c.accent;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.borderLeftColor = c.accent;
                            }}
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0"
                                style={{ background: `${c.accent}22`, border: `1px solid ${c.accent}44` }}>
                                <c.icon className="w-6 h-6" style={{ color: c.accent }} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">{c.title}</h3>
                                <p className="text-xs mt-0.5" style={{ color: 'rgba(240,235,248,0.45)' }}>{c.subtitle}</p>
                            </div>
                            <span className="ml-auto" style={{ color: 'rgba(240,235,248,0.3)' }}>→</span>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
