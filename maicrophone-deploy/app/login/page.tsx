'use client';

import { Mic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function ForestBackground() {
    return (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', height: '43vh', pointerEvents: 'none', zIndex: 2 }}>
            <svg viewBox="0 0 420 280" xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMax slice" style={{ width: '100%', height: '100%' }}>
                {/* 遠景樹：淡紫，製造景深 */}
                <polygon points="160,175 185,280 135,280" fill="rgba(110,45,155,0.38)" />
                <polygon points="260,185 290,280 230,280" fill="rgba(100,38,145,0.38)" />
                <polygon points="50,155 82,280 18,280"   fill="rgba(90,30,135,0.42)" />
                <polygon points="340,150 378,280 302,280" fill="rgba(90,30,135,0.42)" />
                {/* 中景樹：深紫，主要剪影 */}
                <polygon points="65,108  97,280  33,280"  fill="rgba(48,10,88,0.72)" />
                <polygon points="210,98 252,280 168,280"  fill="rgba(44,8,80,0.68)" />
                <polygon points="355,112 392,280 318,280" fill="rgba(48,10,88,0.72)" />
                {/* 近景樹：近黑，最前層 */}
                <polygon points="-15,18  34,280 -64,280"  fill="rgba(14,4,28,0.97)" />
                <polygon points="42,-8   91,280  -7,280"  fill="rgba(11,3,24,0.98)" />
                <polygon points="115,28 160,280  70,280"  fill="rgba(14,4,28,0.93)" />
                <polygon points="305,38 350,280 260,280"  fill="rgba(14,4,28,0.93)" />
                <polygon points="370,-2 420,280 320,280"  fill="rgba(11,3,24,0.98)" />
                <polygon points="432,12 480,280 384,280"  fill="rgba(14,4,28,0.97)" />
                {/* 近景樹的上層分枝 */}
                <polygon points="42,28  66,88  18,88"    fill="rgba(11,3,24,0.98)" />
                <polygon points="370,32 394,92 346,92"   fill="rgba(11,3,24,0.98)" />
                <polygon points="115,72 140,132 90,132"  fill="rgba(14,4,28,0.93)" />
                <polygon points="305,82 330,138 280,138" fill="rgba(14,4,28,0.93)" />
                {/* 地面 */}
                <rect x="-10" y="260" width="440" height="30" fill="rgba(10,3,20,0.99)" />
            </svg>
        </div>
    );
}

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            router.replace('/');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const trimmed = username.trim();
        if (trimmed.length < 2 || trimmed.length > 20) {
            setError('使用者名稱需要 2–20 個字元');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: trimmed }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || '登入失敗');
                return;
            }
            const data = await res.json();
            localStorage.setItem('user', JSON.stringify({ userId: data.userId, username: data.username }));
            router.replace('/onboarding');
        } catch {
            setError('網路錯誤，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <ForestBackground />
            <div
                className="flex min-h-screen items-center justify-center p-4 relative"
                style={{ backgroundColor: '#0D0A14' }}
            >
                {/* Background glows */}
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(255,45,122,0.12) 0%, transparent 70%)' }} />

                <div className="relative w-full max-w-sm rounded-3xl p-8 backdrop-blur-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', zIndex: 10 }}>
                    <div className="mb-8 flex flex-col items-center gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full"
                            style={{ background: 'rgba(255,45,122,0.2)', border: '1px solid rgba(255,45,122,0.4)' }}>
                            <Mic className="h-8 w-8" style={{ color: '#FF2D7A' }} />
                        </div>
                        <h1
                            className="text-3xl font-extrabold"
                            style={{
                                fontFamily: "'Bricolage Grotesque', sans-serif",
                                background: 'linear-gradient(135deg, #FF2D7A, #8B5CF6)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Maicrophone
                        </h1>
                        <p className="text-sm" style={{ color: 'rgba(240,235,248,0.5)' }}>歌唱力養成森林，等你來探索</p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="輸入你的暱稱"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            maxLength={20}
                            className="rounded-2xl px-4 py-3 text-white outline-none transition-all"
                            style={{
                                background: 'rgba(255,255,255,0.07)',
                                border: '1px solid rgba(255,255,255,0.12)',
                            }}
                            onFocus={(e) => (e.target.style.border = '1px solid #8B5CF6')}
                            onBlur={(e) => (e.target.style.border = '1px solid rgba(255,255,255,0.12)')}
                        />
                        {error && <p className="text-sm" style={{ color: '#FF2D7A' }}>{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-2xl py-3 font-bold text-white transition-opacity disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #FF2D7A, #8B5CF6)' }}
                        >
                            {loading ? '登入中...' : '進入森林 🎤'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
