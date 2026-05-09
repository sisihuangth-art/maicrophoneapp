import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

const VALID_TYPES = ['total', 'rhythm', 'expression', 'technique', 'stability', 'pitch'] as const;
type LeaderboardType = (typeof VALID_TYPES)[number];

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const type = (searchParams.get('type') ?? 'total') as LeaderboardType;
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 100);

    if (!VALID_TYPES.includes(type)) {
        return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('users')
        .select('id, username, title, score_rhythm, score_expression, score_technique, score_stability, score_pitch');

    if (error) {
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    const rows = (data ?? []).map((u) => {
        const scores = {
            rhythm: u.score_rhythm as number,
            expression: u.score_expression as number,
            technique: u.score_technique as number,
            stability: u.score_stability as number,
            pitch: u.score_pitch as number,
        };
        const total = scores.rhythm + scores.expression + scores.technique + scores.stability + scores.pitch;
        return {
            userId: u.id,
            username: u.username,
            title: u.title,
            scores,
            total,
        };
    });

    // Sort descending by the chosen type
    if (type === 'total') {
        rows.sort((a, b) => b.total - a.total);
    } else {
        rows.sort((a, b) => b.scores[type] - a.scores[type]);
    }

    // Add rank and trim
    const ranked = rows.slice(0, limit).map((row, i) => ({ rank: i + 1, ...row }));

    return NextResponse.json({ type, entries: ranked });
}
