import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    const { userId } = await params;

    const { data, error } = await supabase
        .from('users')
        .select('id, username, title, score_rhythm, score_expression, score_technique, score_stability, score_pitch')
        .eq('id', userId)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const scores = {
        rhythm: data.score_rhythm,
        expression: data.score_expression,
        technique: data.score_technique,
        stability: data.score_stability,
        pitch: data.score_pitch,
    };
    const total = scores.rhythm + scores.expression + scores.technique + scores.stability + scores.pitch;

    return NextResponse.json({
        userId: data.id,
        username: data.username,
        title: data.title,
        scores,
        total,
    });
}
