'use client';

import { Mic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
        <div
            className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden"
            style={{ backgroundColor: '#0D0A14' }}
        >
            {/* Background glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,45,122,0.12) 0%, transparent 70%)' }} />

            <div className="relative w-full max-w-sm rounded-3xl p-8 backdrop-blur-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
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
    );
}
