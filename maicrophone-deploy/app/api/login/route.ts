import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { username } = await req.json();

    if (!username || typeof username !== 'string' || username.trim().length < 2 || username.trim().length > 20) {
        return NextResponse.json({ error: 'Username must be 2–20 characters' }, { status: 400 });
    }

    const trimmed = username.trim();

    // Upsert user by username
    const { data, error } = await supabase
        .from('users')
        .upsert({ username: trimmed }, { onConflict: 'username' })
        .select('id, username, title, score_rhythm, score_expression, score_technique, score_stability, score_pitch')
        .single();

    if (error) {
        console.error('Login upsert error:', error);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }

    return NextResponse.json({
        userId: data.id,
        username: data.username,
        title: data.title,
        scores: {
            rhythm: data.score_rhythm,
            expression: data.score_expression,
            technique: data.score_technique,
            stability: data.score_stability,
            pitch: data.score_pitch,
        },
    });
}
