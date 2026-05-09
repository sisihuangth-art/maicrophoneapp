import { tool } from 'ai';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';

const SCORE_COLUMNS: Record<string, string> = {
    pitch: 'score_pitch',
    rhythm: 'score_rhythm',
    expression: 'score_expression',
    technique: 'score_technique',
    stability: 'score_stability',
};

const TITLES: [number, string][] = [
    [200, '麥克風稱霸者'],
    [150, '歌唱精靈'],
    [100, '音樂行者'],
    [50, '初出茅廬'],
    [0, '大音痴是你'],
];

function computeTitle(total: number): string {
    return (TITLES.find(([min]) => total >= min) ?? TITLES[TITLES.length - 1])[1];
}

export function makeUploadScoreTool(userId?: string, allowedTypes?: string[]) {
    return tool({
        description:
            'Upload a score for the user after analyzing their singing. Call this once per score dimension.',
        inputSchema: z.object({
            scoreType: z.enum(['pitch', 'rhythm', 'expression', 'technique', 'stability']).describe('Which dimension to score'),
            score: z.number().int().min(0).max(50).describe('Score from 0-50 for this dimension'),
            reason: z.string().describe('Brief reason for this score'),
        }),
        execute: async ({ scoreType, score, reason }) => {
            if (allowedTypes && !allowedTypes.includes(scoreType)) {
                return { success: false, error: `scoreType '${scoreType}' not allowed for this challenge` };
            }
            if (!userId) return { success: false, error: 'No userId provided' };

            const column = SCORE_COLUMNS[scoreType];
            if (!column) return { success: false, error: 'Invalid scoreType' };

            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('score_pitch, score_rhythm, score_expression, score_technique, score_stability')
                .eq('id', userId)
                .single() as { data: any; error: any };

            if (fetchError || !user) return { success: false, error: 'User not found' };

            const currentScore = (user as any)[column] as number;
            if (score <= currentScore) {
                return { success: true, updated: false, message: `Score ${score} not higher than current best ${currentScore}`, scoreType, score, reason, _instruction: 'Score noted. Now give the user detailed personalized feedback based on the analysis results.' };
            }

            const newScores = {
                score_pitch: user.score_pitch,
                score_rhythm: user.score_rhythm,
                score_expression: user.score_expression,
                score_technique: user.score_technique,
                score_stability: user.score_stability,
                [column]: score,
            };
            const total = Object.values(newScores).reduce((a, b) => a + b, 0);
            const title = computeTitle(total);

            const { error: updateError } = await supabase
                .from('users')
                .update({ [column]: score, title, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (updateError) return { success: false, error: 'Update failed' };

            return { success: true, updated: true, scoreType, score, previousScore: currentScore, newTotal: total, newTitle: title, reason, _instruction: 'Score saved. Now give the user detailed personalized feedback based on the analysis results.' };
        },
    });
}
