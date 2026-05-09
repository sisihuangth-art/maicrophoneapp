import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { observe } from '@langfuse/tracing';
import { trace } from '@opentelemetry/api';
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';
import { after } from 'next/server';

import { isLangfuseEnabled, langfuseSpanProcessor } from '@/instrumentation';
import { getChallengeConfig } from '@/lib/challenges';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Allow streaming responses up to 120 seconds (agent loops need more time)
export const maxDuration = 300;

const handler = async (req: Request) => {
  const { messages, userId, challengeId }: { messages: Array<UIMessage>; userId?: string; challengeId: string } = await req.json();

  const challenge = getChallengeConfig(challengeId);

  // For longtone/pitchmatching: strip audio file parts and inject URLs as text
  // (the model only needs the URL to pass to server-side analysis tools)
  // For karaoke: keep audio file parts so Gemini can hear the actual singing with lyrics
  const stripAudioFiles = challengeId !== 'karaoke';
  const augmentedMessages = messages.map((msg) => {
    if (msg.role !== 'user' || !Array.isArray(msg.parts)) return msg;
    const fileUrls = msg.parts
      .filter((p: any) => p.type === 'file' && p.url)
      .map((p: any) => p.url as string);
    if (fileUrls.length === 0) return msg;
    return {
      ...msg,
      parts: [
        ...(stripAudioFiles ? msg.parts.filter((p: any) => p.type !== 'file') : msg.parts),
        ...fileUrls.map((url: string) => ({ type: 'text' as const, text: `Audio file URL: ${url}` })),
      ],
    };
  });

  console.log(`[chat] request`, {
    challengeId,
    userId,
    messageCount: messages.length,
    lastMessage: JSON.stringify(messages[messages.length - 1]?.parts?.map((p: any) => ({ type: p.type, text: p.text?.slice(0, 80), url: p.url }))),
  });

  const result = streamText({
    maxRetries: 0,
    model: google('gemini-2.5-flash'),
    providerOptions: {
      google: { thinkingConfig: { includeThoughts: false } },
    },
    system: challenge.system,
    messages: await convertToModelMessages(augmentedMessages),
    tools: challenge.tools(userId),
    stopWhen: stepCountIs(10),
    experimental_telemetry: { isEnabled: isLangfuseEnabled },
    onStepFinish: (event) => {
      const { toolCalls, toolResults, text, finishReason, usage } = event;
      console.log(`[chat] step finished`, {
        challengeId,
        userId,
        finishReason,
        usage,
        toolCalls: toolCalls?.map((tc: any) => ({ name: tc.toolName, args: tc.args })),
        toolResults: toolResults?.map((tr: any) => ({ name: tr.toolName, result: tr.result })),
        textLength: text?.length ?? 0,
      });
    },
    onFinish: async ({ finishReason, steps, text, usage }) => {
      console.log(`[chat] stream finished`, {
        challengeId,
        userId,
        finishReason,
        totalSteps: steps.length,
        textLength: text?.length ?? 0,
        usage,
      });
      if (isLangfuseEnabled) trace.getActiveSpan()?.end();
    },
    onError: async ({ error }) => {
      console.error(`[chat] stream error`, { challengeId, userId, error });
      if (isLangfuseEnabled) trace.getActiveSpan()?.end();
    },
  });

  if (isLangfuseEnabled) {
    // Critical for serverless: flush traces before function terminates
    after(async () => await langfuseSpanProcessor!.forceFlush());
  }

  return result.toUIMessageStreamResponse({ sendReasoning: false });
};

// Wrap handler with observe() only when Langfuse is configured
export const POST = isLangfuseEnabled
  ? observe(handler, {
    name: 'chat',
    endOnExit: false, // Don't end observation until stream finishes
  })
  : handler;
