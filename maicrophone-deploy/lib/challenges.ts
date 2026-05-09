import fs from 'node:fs';
import path from 'node:path';

import type { Tool } from 'ai';

import { makeKaraokeTools, makeLongToneTools, makePitchMatchingTools } from '@/lib/tools';

export interface ChallengeConfig {
    system: string;
    tools: (userId?: string) => Record<string, Tool>;
}

function loadPrompt(name: string): string {
    return fs.readFileSync(path.join(process.cwd(), `prompts/${name}.md`), 'utf-8');
}

const challenges: Record<string, ChallengeConfig> = {
    onboarding: {
        system: loadPrompt('onboarding'),
        tools: () => ({}),
    },
    pitchmatching: {
        system: loadPrompt('pitchmatching'),
        tools: (userId) => makePitchMatchingTools(userId),
    },
    longtone: {
        system: loadPrompt('longtone'),
        tools: (userId) => makeLongToneTools(userId),
    },
    karaoke: {
        system: loadPrompt('karaoke'),
        tools: (userId) => makeKaraokeTools(userId),
    },
};

export function getChallengeConfig(challengeId: string): ChallengeConfig {
    const config = challenges[challengeId];
    if (!config) throw new Error(`Unknown challenge: ${challengeId}`);
    return config;
}
