# Maicrophone 🎤

**你的 AI 互動式聲唱教練** — 聆聽你的歌聲、分析你的表現、幫助你進步。

## 功能特色

- 🎙️ **聲唱挑戰** — 三種挑戰關卡，分別測試音準、氣息控制、節奏、情感表達與技巧
- 🤖 **AI 分析** — 由 Gemini 驅動，提供分數、優點與改善建議
- 🏆 **排行榜** — 與其他使用者比拼，查看排名
- 📊 **進度追蹤** — 查看歷史最高分，依總分獲得稱號
- 💬 **AI 聊天** — 互動式聊天介面，支援語音轉文字

## 技術架構

| 層級 | 技術 |
|------|------|
| 框架 | [Next.js 15](https://nextjs.org)（App Router） |
| 語言 | TypeScript |
| UI | React 19、Tailwind CSS 4 |
| AI | [Vercel AI SDK](https://sdk.vercel.ai) + Google Gemini |
| 資料庫與儲存 | [Supabase](https://supabase.com) |
| 可觀測性 | [Langfuse](https://langfuse.com)（OpenTelemetry） |
| 套件管理 | pnpm |

## 前置需求

- Node.js ≥ 18
- pnpm
- Supabase 專案
- Google AI Studio / Gemini API 金鑰

## 安裝與啟動

```bash
# 複製專案
git clone https://github.com/<your-org>/maicrophoneapp.git
cd maicrophoneapp

# 安裝依賴
pnpm install

# 複製環境變數範本並填入你的金鑰
cp .env.example .env

# 執行資料庫遷移
# （透過 Supabase Dashboard 或 CLI 套用 supabase/migrations/ 中的 SQL 檔案）

# 啟動開發伺服器
pnpm dev
```

開啟瀏覽器前往 [http://localhost:3000](http://localhost:3000)。

## 必要環境變數

| 變數 | 說明 |
|------|------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini API 金鑰 |
| `APP_URL` | 應用程式公開網址 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案網址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名公開金鑰 |
| `LANGFUSE_SECRET_KEY` | Langfuse 秘密金鑰（可觀測性） |
| `LANGFUSE_PUBLIC_KEY` | Langfuse 公開金鑰 |
| `LANGFUSE_BASEURL` | Langfuse API 基礎網址 |
| `YOUTUBE_API_KEY` | YouTube Data API 金鑰 |

詳見 [.env.example](.env.example)。

## 指令

| 指令 | 說明 |
|------|------|
| `pnpm dev` | 啟動開發伺服器 |
| `pnpm build` | 正式環境建置 |
| `pnpm start` | 啟動正式伺服器 |
| `pnpm lint` | 執行 ESLint 檢查 |
