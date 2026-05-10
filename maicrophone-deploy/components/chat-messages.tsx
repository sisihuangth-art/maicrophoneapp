import { NotePlayer } from '@/components/note-player';
import { Activity, FileAudio, Music, Search, Target, Volume2, Wind } from 'lucide-react';

const YOUTUBE_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const NOTE_ARRAY_RE = /\[\s*"[A-Ga-g][#b]?\d"(?:\s*,\s*"[A-Ga-g][#b]?\d")*\s*\]/;
const LONGTONE_TARGET_RE = /\{\s*"note"\s*:\s*"([A-Ga-g]#?\d)"\s*,\s*"vowel"\s*:\s*"(\w+)"\s*\}/;

function renderMarkdown(text: string): React.ReactNode {
    const paragraphs = text.split('\n').filter((p) => p.trim() !== '');
    if (paragraphs.length === 0) return null;
    return (
        <>
            {paragraphs.map((para, pIdx) => {
                const parts = para.split(/(\*\*[^*]+\*\*)/g);
                return (
                    <p key={pIdx} style={{ marginTop: pIdx > 0 ? '0.6rem' : 0, lineHeight: '1.65' }}>
                        {parts.map((part, i) =>
                            part.startsWith('**') && part.endsWith('**')
                                ? <strong key={i} style={{ fontWeight: 700, color: '#FF2D7A' }}>{part.slice(2, -2)}</strong>
                                : <span key={i}>{part}</span>
                        )}
                    </p>
                );
            })}
        </>
    );
}

interface YouTubeVideoResult {
    videoId: string;
    title: string;
    channelTitle: string;
    url: string;
    embedUrl: string;
}

function extractYouTubeVideos(result: unknown): YouTubeVideoResult[] {
    const rawList = Array.isArray(result)
        ? result
        : (result && typeof result === 'object'
            ? ((result as Record<string, unknown>).videos
                ?? (result as Record<string, unknown>).items
                ?? (result as Record<string, unknown>).result
                ?? (result as Record<string, unknown>).results)
            : null);
    if (!Array.isArray(rawList)) return [];
    return rawList
        .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const obj = item as Record<string, unknown>;
            const videoId = typeof obj.videoId === 'string' ? obj.videoId : '';
            const title = typeof obj.title === 'string' ? obj.title : '';
            const channelTitle = typeof obj.channelTitle === 'string' ? obj.channelTitle : '';
            const url = typeof obj.url === 'string' ? obj.url : '';
            const embedUrl = typeof obj.embedUrl === 'string' ? obj.embedUrl : '';
            if (!videoId || !YOUTUBE_VIDEO_ID_RE.test(videoId) || !title) return null;
            return { videoId, title, channelTitle, url, embedUrl };
        })
        .filter((video): video is YouTubeVideoResult => video !== null);
}

interface MessagePart {
    type: string;
    text?: string;
    mediaType?: string;
    url?: string;
    state?: string;
    result?: unknown;
    output?: unknown;
    toolInvocation?: { toolName: string; state: string; args?: Record<string, unknown>; result?: unknown };
}

function getToolPayload(part: MessagePart): { toolName: string; state: string; result: unknown } | null {
    if (part.type === 'tool-invocation' && part.toolInvocation) {
        return { toolName: part.toolInvocation.toolName, state: part.toolInvocation.state, result: part.toolInvocation.result };
    }
    if (part.type.startsWith('tool-')) {
        return { toolName: part.type.slice(5), state: typeof part.state === 'string' ? part.state : 'result', result: part.result ?? part.output };
    }
    return null;
}

interface Message { id: string; role: string; parts?: MessagePart[]; }

interface ChatMessagesProps {
    messages: Message[];
    isLoading: boolean;
    uploadProgress?: string | null;
}

export function ChatMessages({ messages, isLoading, uploadProgress }: ChatMessagesProps) {
    if (messages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 backdrop-blur-md rounded-[3rem] w-full max-w-md mx-auto shadow-2xl gap-8 mt-4"
                style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                <div className="space-y-2 text-center">
                    <h2 className="text-xl font-semibold text-white">準備好了嗎？✨</h2>
                    <p className="text-sm" style={{ color: 'rgba(240,235,248,0.4)' }}>打字、說話或錄音，開始練唱吧！</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {messages.map((m) =>
                m.role !== 'system' ? (
                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                        <div
                            className={`p-4 rounded-3xl max-w-[85%] ${m.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`}
                            style={m.role === 'user'
                                ? { background: 'linear-gradient(135deg, rgba(255,45,122,0.25), rgba(139,92,246,0.25))', border: '1px solid rgba(255,45,122,0.3)', color: 'rgba(255,255,255,0.95)' }
                                : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,235,248,0.9)' }
                            }
                        >
                            {Array.isArray(m.parts)
                                ? m.parts.map((p, i) => {
                                    if (p.type === 'reasoning') return (
                                        <details key={i} className="mb-2 text-sm">
                                            <summary className="cursor-pointer select-none" style={{ color: 'rgba(255,255,255,0.4)' }}>💭 思考中…</summary>
                                            <pre className="mt-1 whitespace-pre-wrap text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.text}</pre>
                                        </details>
                                    );
                                    if (p.type === 'text') {
                                        const text = p.text ?? '';
                                        const isAssistant = m.role === 'assistant';

                                        const longtoneMatch = text.match(LONGTONE_TARGET_RE);
                                        if (longtoneMatch) {
                                            const startIdx = text.indexOf(longtoneMatch[0]);
                                            const before = text.slice(0, startIdx).trim();
                                            const after = text.slice(startIdx + longtoneMatch[0].length).trim();
                                            return (
                                                <div key={i}>
                                                    {before && <div className="mb-2">{isAssistant ? renderMarkdown(before) : before}</div>}
                                                    <NotePlayer notes={[longtoneMatch[1]]} />
                                                    <div className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>發聲方式：{longtoneMatch[2]}</div>
                                                    {after && <div className="mt-2">{isAssistant ? renderMarkdown(after) : after}</div>}
                                                </div>
                                            );
                                        }

                                        const match = text.match(NOTE_ARRAY_RE);
                                        if (match) {
                                            try {
                                                const startIdx = text.indexOf(match[0]);
                                                const before = text.slice(0, startIdx).trim();
                                                const after = text.slice(startIdx + match[0].length).trim();
                                                const notes: string[] = JSON.parse(match[0]);
                                                return (
                                                    <div key={i}>
                                                        {before && <div className="mb-2">{isAssistant ? renderMarkdown(before) : before}</div>}
                                                        <NotePlayer notes={notes} />
                                                        {after && <div className="mt-2">{isAssistant ? renderMarkdown(after) : after}</div>}
                                                    </div>
                                                );
                                            } catch { /* fall through */ }
                                        }

                                        return <div key={i}>{isAssistant ? renderMarkdown(text) : text}</div>;
                                    }

                                    const toolPayload = getToolPayload(p);
                                    if (toolPayload) {
                                        const { toolName, state, result } = toolPayload;
                                        const n = toolName.toLowerCase();

                                        if (n === 'analyzepitch' && state === 'result' && result != null) {
                                            const pitchResult = result as { results?: Array<{ target: string; detected: string | null; centsOff: number; hit: boolean; noteScore: number; label: string }>; score?: number };
                                            if (pitchResult.results) return (
                                                <div key={i} className="mt-2 space-y-2">
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-pink-300"><Target className="w-4 h-4" />音準分析結果</div>
                                                    <div className="space-y-1.5">
                                                        {pitchResult.results.map((r, j) => {
                                                            const colors = { excellent: 'text-green-400 border-green-500/30 bg-green-500/10', good: 'text-blue-400 border-blue-500/30 bg-blue-500/10', fair: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10', miss: 'text-red-400 border-red-500/30 bg-red-500/10', undetected: 'text-zinc-500 border-zinc-600/30 bg-zinc-700/10' }[r.label] ?? 'text-zinc-400 border-zinc-600/30';
                                                            return <div key={j} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-mono ${colors}`}><span>🎵 {r.target} → {r.detected ?? '—'}</span><span>{r.noteScore}/10 ({r.label}{r.detected ? `, ${r.centsOff > 0 ? '+' : ''}${r.centsOff}¢` : ''})</span></div>;
                                                        })}
                                                    </div>
                                                    <div className="text-right text-sm font-bold text-pink-300">總分：{pitchResult.score} / 50</div>
                                                </div>
                                            );
                                        }

                                        if (n === 'analyzecleanduration' && state === 'result' && result != null) {
                                            const r = result as { cleanDurationSeconds?: number; totalDurationSeconds?: number; score?: number; timeline?: Array<{ second: number; status: string }> };
                                            return (
                                                <div key={i} className="mt-2 space-y-2">
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300"><Wind className="w-4 h-4" />有效持續時長分析</div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        {[{ label: '乾淨時長', val: `${r.cleanDurationSeconds}s`, color: 'text-cyan-400' }, { label: '總時長', val: `${r.totalDurationSeconds}s`, color: 'text-white' }, { label: '得分', val: `${r.score}/15`, color: 'text-cyan-400' }].map((item) => (
                                                            <div key={item.label} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}><div style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</div><div className={`text-lg font-bold ${item.color}`}>{item.val}</div></div>
                                                        ))}
                                                    </div>
                                                    {r.timeline && r.timeline.length > 0 && <div className="flex gap-1 flex-wrap">{r.timeline.map((t, j) => <div key={j} className={`w-6 h-4 rounded text-[9px] flex items-center justify-center ${t.status === 'clean' ? 'bg-green-500/70' : t.status === 'breathy' ? 'bg-yellow-500/70' : 'bg-zinc-600/70'}`}>{t.second}</div>)}</div>}
                                                </div>
                                            );
                                        }

                                        if (n === 'analyzepitchstability' && state === 'result' && result != null) {
                                            const r = result as { meanCentsOff?: number; stdCentsOff?: number; score?: number };
                                            return (
                                                <div key={i} className="mt-2 space-y-2">
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-300"><Activity className="w-4 h-4" />音準穩定度分析</div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        {[{ label: '平均偏差', val: `${r.meanCentsOff}¢` }, { label: '標準差', val: `${r.stdCentsOff}¢` }, { label: '得分', val: `${r.score}/15` }].map((item) => (
                                                            <div key={item.label} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}><div style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</div><div className="text-lg font-bold text-blue-400">{item.val}</div></div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (n === 'analyzetonequality' && state === 'result' && result != null) {
                                            const r = result as { avgSpectralFlatness?: number; breathinessOnsetSecond?: number | null; score?: number; timeline?: Array<{ second: number; quality: string }> };
                                            return (
                                                <div key={i} className="mt-2 space-y-2">
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-300"><Music className="w-4 h-4" />音色品質分析</div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        {[{ label: '氣息比', val: `${r.avgSpectralFlatness}` }, { label: '氣音起始', val: r.breathinessOnsetSecond ? `${r.breathinessOnsetSecond}s` : '無' }, { label: '得分', val: `${r.score}/10` }].map((item) => (
                                                            <div key={item.label} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}><div style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</div><div className="text-lg font-bold text-purple-400">{item.val}</div></div>
                                                        ))}
                                                    </div>
                                                    {r.timeline && r.timeline.length > 0 && <div className="flex gap-1 flex-wrap">{r.timeline.map((t, j) => <div key={j} className={`w-6 h-4 rounded text-[9px] flex items-center justify-center ${t.quality === 'clean' ? 'bg-green-500/70' : t.quality === 'fair' ? 'bg-yellow-500/70' : 'bg-red-500/70'}`}>{t.second}</div>)}</div>}
                                                </div>
                                            );
                                        }

                                        if (n === 'analyzevolumesteadiness' && state === 'result' && result != null) {
                                            const r = result as { rmsCV?: number; decayDetected?: boolean; score?: number; timeline?: Array<{ second: number; rms: number }> };
                                            const maxRms = r.timeline ? Math.max(...r.timeline.map((t) => t.rms), 0.001) : 1;
                                            return (
                                                <div key={i} className="mt-2 space-y-2">
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-300"><Volume2 className="w-4 h-4" />音量穩定度分析</div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        {[{ label: '變異係數', val: `${r.rmsCV}`, color: 'text-amber-400' }, { label: '衰減', val: r.decayDetected ? '有' : '無', color: r.decayDetected ? 'text-red-400' : 'text-green-400' }, { label: '得分', val: `${r.score}/10`, color: 'text-amber-400' }].map((item) => (
                                                            <div key={item.label} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.06)' }}><div style={{ color: 'rgba(255,255,255,0.4)' }}>{item.label}</div><div className={`text-lg font-bold ${item.color}`}>{item.val}</div></div>
                                                        ))}
                                                    </div>
                                                    {r.timeline && r.timeline.length > 1 && (
                                                        <svg width="100%" height="32" viewBox="0 0 200 32" className="rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} preserveAspectRatio="none">
                                                            <polyline points={r.timeline.map((t, j) => `${(j / (r.timeline!.length - 1)) * 200},${32 - (t.rms / maxRms) * 28}`).join(' ')} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round" />
                                                        </svg>
                                                    )}
                                                </div>
                                            );
                                        }

                                        if (n === 'searchyoutubevideos' && result != null) {
                                            const videos = extractYouTubeVideos(result);
                                            if (videos.length === 0) return <div key={i} className="text-xs my-1" style={{ color: 'rgba(255,255,255,0.4)' }}>找不到可播放的 YouTube 建議。</div>;
                                            return (
                                                <div key={i} className="space-y-2 mt-2">
                                                    {videos.map((video) => (
                                                        <div key={video.videoId} className="rounded-2xl p-2.5" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                                                            <div className="text-xs font-semibold text-white line-clamp-1 mb-1">{video.title}</div>
                                                            {/* ✅ 問題9：縮小影片高度，讓影片和錄音鍵同時可見 */}
                                                            <div className="overflow-hidden rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                                                                <iframe
                                                                    src={video.embedUrl || `https://www.youtube.com/embed/${video.videoId}`}
                                                                    title={video.title}
                                                                    className="w-full"
                                                                    style={{ height: '150px' }}
                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                                    referrerPolicy="strict-origin-when-cross-origin"
                                                                    allowFullScreen
                                                                />
                                                            </div>
                                                            {video.url && <a href={video.url} target="_blank" rel="noreferrer" className="inline-block mt-1 text-xs" style={{ color: '#8B5CF6' }}>在 YouTube 上觀看 ↗</a>}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={i} className="flex items-center gap-2 text-xs my-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                                <Search className="w-3 h-3" />
                                                <span>{state === 'result' ? `✓ ${toolName}` : `${toolName} 處理中…`}</span>
                                            </div>
                                        );
                                    }
                                    if (p.type === 'source') return null;
                                    if (p.type === 'file' && typeof p.mediaType === 'string' && p.mediaType.startsWith('audio/')) {
                                        return <div key={i} className="flex items-center gap-2 mt-1"><FileAudio className="w-4 h-4 flex-shrink-0 opacity-70" /><audio src={p.url} controls className="h-8 max-w-full" /></div>;
                                    }
                                    return null;
                                })
                                : null}
                        </div>
                    </div>
                ) : null,
            )}

            {uploadProgress && (
                <div className="flex justify-start">
                    <div className="p-4 rounded-3xl max-w-[85%] rounded-bl-none flex items-center gap-2"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#8B5CF6' }}>
                        <svg className="w-4 h-4 animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" /></svg>
                        {uploadProgress}
                    </div>
                </div>
            )}

            {isLoading && !uploadProgress && (
                <div className="flex justify-start">
                    <div className="p-4 rounded-3xl max-w-[85%] rounded-bl-none flex items-center gap-2"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,235,248,0.5)' }}>
                        <span className="text-sm">Maicrophone 思考中</span>
                        <span className="flex items-center gap-1 ml-0.5">
                            {[0, 1, 2].map((i) => <span key={i} className="inline-block w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#8B5CF6', animationDelay: `${i * 0.15}s` }} />)}
                        </span>
                    </div>
                </div>
            )}
        </>
    );
}
