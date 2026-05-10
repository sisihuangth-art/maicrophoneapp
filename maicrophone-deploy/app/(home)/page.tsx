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
        num: '第一關',
        title: '魔法少女 Do Re Mi',
        subtitle: '音準挑戰',
        emoji: '🎵',
        icon: Music,
        href: '/challenge/pitchmatching',
    },
    {
        num: '第二關',
        title: '一口氣到底',
        subtitle: '氣息控制挑戰',
        emoji: '🌊',
        icon: Wind,
        href: '/challenge/longtone',
    },
    {
        num: '第三關',
        title: 'K哥之王',
        subtitle: '歌曲挑戰',
        emoji: '🎤',
        icon: Mic2,
        href: '/challenge/karaoke',
    },
];

const scoreItems = [
    { label: '音準', key: 'pitch' as const, color: '#FF2D7A' },
    { label: '氣息', key: 'stability' as const, color: '#8B5CF6' },
    { label: '節奏', key: 'rhythm' as const, color: '#FFD93D' },
    { label: '情感', key: 'expression' as const, color: '#FF2D7A' },
    { label: '技巧', key: 'technique' as const, color: '#8B5CF6' },
];

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
        <main className="min-h-screen text-white relative overflow-hidden" style={{ backgroundColor: '#0D0A14' }}>
            {/* Background glows */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute top-[-15%] right-[-15%] w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
                <div className="absolute bottom-[-15%] left-[-15%] w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(255,45,122,0.12) 0%, transparent 70%)' }} />
                <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(255,45,122,0.05) 0%, transparent 70%)' }} />
            </div>

            <div className="relative z-10 max-w-lg mx-auto px-5 pb-10">

                {/* Header */}
                <header className="flex items-start justify-between pt-8 mb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold"
                            style={{
                                fontFamily: "'Bricolage Grotesque', sans-serif",
                                background: 'linear-gradient(135deg, #FF2D7A, #8B5CF6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                            Maicrophone
                        </h1>
                        <p className="text-xs mt-1" style={{ color: 'rgba(240,235,248,0.35)' }}>歌唱力養成森林 🌿</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-semibold text-white">{profile?.username ?? user.username}</p>
                            <p className="text-xs font-medium" style={{ color: '#FFD93D' }}>{title}</p>
                        </div>
                        <button onClick={logout}
                            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs transition"
                            style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(240,235,248,0.45)' }}>
                            <LogOut className="w-3.5 h-3.5" /> 登出
                        </button>
                    </div>
                </header>

                {/* Score card */}
                {scores && (
                    <div className="mb-8 p-4 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-medium" style={{ color: 'rgba(240,235,248,0.45)' }}>歷史最高分</p>
                            <span className="text-sm font-bold" style={{
                                background: 'linear-gradient(135deg, #FF2D7A, #8B5CF6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>總分 {total} / 250</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2 text-center">
                            {scoreItems.map((s) => (
                                <div key={s.label}>
                                    <p className="text-xl font-bold" style={{ color: s.color }}>{scores[s.key]}</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'rgba(240,235,248,0.35)' }}>{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Challenges section */}
                <div className="mb-3">
                    <p className="text-xs font-semibold mb-4 tracking-widest uppercase"
                        style={{ color: 'rgba(240,235,248,0.35)' }}>✦ 選擇關卡 ✦</p>
                    <div className="space-y-3">
                        {challenges.map((c, idx) => (
                            <Link key={c.href} href={c.href}
                                className="group flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 hover:scale-[1.01]"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderLeft: '3px solid rgba(255,45,122,0.6)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,45,122,0.08)';
                                    e.currentTarget.style.borderColor = 'rgba(255,45,122,0.4)';
                                    e.currentTarget.style.borderLeftColor = '#FF2D7A';
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(255,45,122,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.borderLeftColor = 'rgba(255,45,122,0.6)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {/* Number badge */}
                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,45,122,0.3), rgba(139,92,246,0.3))',
                                        border: '1px solid rgba(255,45,122,0.4)',
                                        color: '#FF2D7A',
                                    }}>
                                    {idx + 1}
                                </div>
                                {/* Icon */}
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                    style={{ background: 'rgba(255,45,122,0.1)', border: '1px solid rgba(255,45,122,0.2)' }}>
                                    {c.emoji}
                                </div>
                                {/* Text */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs mb-0.5" style={{ color: 'rgba(255,45,122,0.7)' }}>{c.num}</p>
                                    <h3 className="font-bold text-white text-sm">{c.title}</h3>
                                    <p className="text-xs mt-0.5" style={{ color: 'rgba(240,235,248,0.4)' }}>{c.subtitle}</p>
                                </div>
                                <span style={{ color: 'rgba(255,45,122,0.5)' }}>→</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <span className="text-xs" style={{ color: 'rgba(240,235,248,0.25)' }}>名人堂</span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>

                {/* Leaderboard - separate section */}
                <Link href="/leaderboard"
                    className="flex items-center gap-4 p-4 rounded-2xl transition-all duration-200"
                    style={{
                        background: 'rgba(139,92,246,0.06)',
                        border: '1px solid rgba(139,92,246,0.2)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(139,92,246,0.12)';
                        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(139,92,246,0.06)';
                        e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)';
                    }}
                >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>
                        <Trophy className="w-6 h-6" style={{ color: '#FFD93D' }} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-white text-sm">超級星光大道</h3>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(240,235,248,0.4)' }}>查看分數排行榜</p>
                    </div>
                    <span style={{ color: 'rgba(139,92,246,0.5)' }}>→</span>
                </Link>

            </div>
        </main>
    );
}
