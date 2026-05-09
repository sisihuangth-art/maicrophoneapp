'use client';

import { Mic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // If already logged in, redirect
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
            router.replace('/');
        } catch {
            setError('網路錯誤，請稍後再試');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white/10 p-8 backdrop-blur-md shadow-xl">
                <div className="mb-6 flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/30">
                        <Mic className="h-8 w-8 text-purple-200" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">MAIcrophone</h1>
                    <p className="text-sm text-purple-200">用 AI 挑戰你的歌唱實力</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="輸入你的暱稱"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        maxLength={20}
                        className="rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                    />
                    {error && <p className="text-sm text-red-300">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50"
                    >
                        {loading ? '登入中...' : '開始挑戰'}
                    </button>
                </form>
            </div>
        </div>
    );
}
