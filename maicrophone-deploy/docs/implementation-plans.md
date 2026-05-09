# Implementation Plans

## Phase 1：登入與使用者系統

### 後端
- [x] 在 Supabase 建立 `users` table（含 username、五項最高分、稱號欄位與索引）。
- [x] 實作 `POST /api/login`：驗證 username 長度 2–20，upsert user，回傳 userId、username、title、scores。
- [x] 實作 `GET /api/users/[userId]`：回傳使用者資訊與五項最高分。

### 前端
- [x] 建立登入頁（歡迎頁）：Logo、標語、username 輸入框、「開始挑戰」按鈕。
- [x] 實作 localStorage 登入狀態管理：登入成功存 `{ userId, username }`，頁面載入時檢查並導向。
- [x] 實作登出功能：清除 localStorage 並導回登入頁。

---

## Phase 2：挑戰關卡首頁

### 後端
- [x] 確認 `GET /api/users/[userId]` 回傳格式滿足首頁需求（稱號、五項分數、total）。

### 前端
- [x] 建立挑戰關卡首頁：四張卡片（魔法少女Do Re Mi、一口氣到底、K哥之王、超級星光大道）。
- [x] 右上角使用者資訊區：顯示 username、五項歷史最高分、稱號。
- [x] 登出按鈕整合。

---

## Phase 3：錄音上傳

### 資料庫
- [x] 建立 `recordings` table（`002_create_recordings.sql`）：id, user_id, storage_path, public_url, file_size, mime_type, duration_seconds, created_at，含索引。

### 後端
- [x] 擴充 `POST /api/upload-audio`：接收 `userId`、`durationSeconds`，上傳至 Supabase Storage，建立 `recordings` row，回傳 `recordingId`、`url`、`storagePath`。

### 前端
- [x] 錄音元件整合：請求麥克風權限、錄音、回放、取消、送出。
- [x] 上傳時帶入 `userId`，接收並使用回傳的 `url`。

---

## Phase 4：AI 評分與分數更新

### 後端
- [x] 在 `lib/tools.ts` 新增 `uploadScore` tool：接收 `scoreType`（rhythm / expression / technique / pitch / stability）與 `score`，比較現有分數後更新 `users` 最高分與稱號。
- [x] 確保 `/api/chat` route 從 request body 取出 `userId` 並注入 tool context。
- [x] 更新 system prompt，指導 agent 分析音檔後呼叫 `uploadScore`（五個維度各一次）。

### 前端
- [x] `useChat` 透過 `DefaultChatTransport` body 傳入 `userId`，確保每次請求帶入 userId。
- [x] 第三關（K哥之王）頁面：聊天視窗 UI，顯示文字回覆與工具結果卡片（YouTube 影片卡片等）。

---

## Phase 5：排行榜

### 後端
- [x] 實作 `GET /api/leaderboard?type={type}&limit={limit}`：從 `users` 讀取分數，API 端計算總分排序，回傳排名列表。

### 前端
- [x] 建立排行榜頁面：切換總分 / 單項排行，顯示排名、username、稱號、各項分數。

---

## Phase 6: 第一關（魔法少女 Do Re Mi）音準挑戰

### 後端
- [x] 在 `lib/tools.ts` 新增 `analyzePitch` tool：下載 WAV、用 pitchy 偵測音高、對齊目標音符、計算分數。
- [x] 建立 `prompts/pitchmatching.md` system prompt，定義 agent 工作流程（詢問偏好→產生音符→分析錄音→回饋評分）。

### 前端
- [x] 建立 `app/challenge/doremi/page.tsx` 關卡頁面（chat-based 介面，challengeId='pitchmatching'）。
- [x] 建立 `components/note-player.tsx` 音符卡片元件，透過 Tone.js 播放音符。
- [x] 更新 `components/chat-messages.tsx`：偵測 agent 回傳的音符陣列並渲染 NotePlayer；渲染 `analyzePitch` 結果卡片。

---

## Phase 7：第二關（一口氣到底）氣息控制挑戰

### 後端
- [ ] 在 `lib/tools/long-tone.ts` 實作 4 個分析 tool：
  - [ ] `analyzeCleanDuration`：下載 WAV → Meyda 離線擷取 RMS + ZCR + Spectral Flatness → 逐 frame 判定 clean/breathy/silence → 計算有效持續時長與分數，附帶逐秒 timeline。
  - [ ] `analyzePitchStability`：下載 WAV → Pitchy 偵測每 frame 頻率 → 計算與目標音符的 cents 偏差 mean & std → 分數，附帶逐秒 timeline。
  - [ ] `analyzeToneQuality`：Meyda 離線擷取 Spectral Flatness + Spectral Slope → 計算平均值與氣音退化起始秒數 → 分數，附帶 timeline。
  - [ ] `analyzeVolumeSteadiness`：Meyda 離線擷取 RMS → 計算變異係數 (CV)、偵測衰減趨勢 → 分數，附帶 timeline。
- [ ] 建立 `prompts/longtone.md` system prompt，定義 agent 工作流程（詢問偏好→產生目標音符→依序呼叫 4 tool→時間軸回饋→uploadScore）。
- [ ] 在 `lib/tools/index.ts` 註冊 4 個 long-tone tool 至 challenge route。

### 前端
- [ ] 建立 `app/challenge/longtone/page.tsx` 關卡頁面（chat-based 介面，challengeId='longtone'）。
- [ ] 建立即時 Meyda 分析 hook `hooks/use-meyda.ts`：錄音期間即時擷取 RMS、Spectral Flatness、Chroma，透過 Web Audio API AnalyserNode 串接 Meyda。
- [ ] 建立即時回饋面板元件 `components/longtone-visualizer.tsx`：
  - [ ] 即時音高指示器（目前音高 vs 目標，偏高/偏低箭頭）。
  - [ ] RMS 音量即時折線圖。
  - [ ] 氣息品質指示燈（Spectral Flatness → 綠/黃/紅）。
  - [ ] 持續秒數計時器。
- [ ] 更新 `components/chat-messages.tsx`：渲染 4 個 tool 結果卡片（含 timeline 視覺化）。
