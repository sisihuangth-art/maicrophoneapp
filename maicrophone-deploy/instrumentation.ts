// instrumentation.ts
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

export const isLangfuseEnabled = !!(process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY);

export let langfuseSpanProcessor: LangfuseSpanProcessor | undefined;

if (isLangfuseEnabled) {
    langfuseSpanProcessor = new LangfuseSpanProcessor();

    const tracerProvider = new NodeTracerProvider({
        spanProcessors: [langfuseSpanProcessor],
    });

    tracerProvider.register();
}
