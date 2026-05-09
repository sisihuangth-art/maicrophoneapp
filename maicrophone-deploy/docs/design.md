# Maicrophone: 你的 AI 聲唱教練

Maicrophone 是一個 AI 互動式聲唱教練。

## 核心體驗
1. 使用者輸入名字(username)，建立新的或延續舊的練習身份，並登入至挑戰關卡首頁。
2. 進入挑戰關卡首頁，能看到三個聲唱挑戰、排行榜入口、目前分數與稱號。
3. 使用者選擇關卡後，進入對應的關卡頁面進行挑戰。
4. 使用者完成每個挑戰後，即可回到首頁進入其他關卡挑戰。
5. 使用者可以在首頁看到目前分數以及稱號。
6. 使用者能點進排行榜頁面，查看自己跟其他使用者的排名與分數。
7. 使用者能登出挑戰首頁，給其他使用者登入。

## 分數定義
1. 評估項目為：
	- 音準(Pitch)
	- 氣息控制(Breath Control)
	- 節奏(Rhythm)
	- 情感表達(Expression)
	- 技巧(Technique)
2. 每項評估項目滿分為50分，五項總分為 250 分
3. 評估項目與對應的挑戰關卡：
	- 第一關：評估音準。
	- 第二關：評估氣息控制。
	- 第三關：評估節奏、情感表達、技巧。

## 頁面架構

### 第一層：登入頁 / 歡迎頁

目的：用最少資訊建立使用者身份，讓使用者立刻開始練習。

前端需求：
- 顯示產品 Logo、名稱、標語：「Maicrophone，你的 AI 互動式聲唱教練」。
- 提供 username 輸入框，placeholder 可用「輸入你的暱稱」。
- 按下「開始挑戰」後驗證名字不可為空，長度建議 2-20 字。
- 成功後導向挑戰關卡首頁。

後端需求：
- 在 Supabase 建立或更新 User 資訊。

### 登入狀態管理

MVP 使用瀏覽器 `localStorage` 儲存登入狀態，不依賴 server-side session。

策略：
- 登入成功後，前端將 `{ userId, username }` 存入 `localStorage`。
- 頁面載入時讀取 `localStorage`，若無資料則導向登入頁。
- 後續 API 呼叫由前端從 `localStorage` 取出 `userId` / `username` 放入 request body。
- 登出時呼叫 `localStorage.removeItem('user')` 並導回登入頁，無需呼叫後端 API。

### 第二層：挑戰關卡首頁

目的：讓使用者清楚知道可以挑戰什麼、目前強弱項在哪裡。

前端需求：
1. 頁面卡片：
	- Title：魔法少女Do Re Mi，Subtitle：音準挑戰
	- Title：一口氣到底，Subtitle：氣息控制挑戰
	- Title：K哥之王，Subtitle：歌曲挑戰 
	- Title：超級星光大道，Subtitle：查看分數排行榜
2. 右上角使用者資訊
	- username
	- 五項分數歷史最高分
	- 稱號，根據總分而定
		- 0–50 分：大音痴是你
		- 51–100 分：愛唱歌的路人
		- 101–150 分：KTV模範生
		- 151–220 分：麥克風稱霸者
		- 221–250 分：天籟之音
3. 登出按鈕

### 第三層：關卡頁面

所有關卡共用流程：
1. 顯示任務說明與評分重點。
2. 使用者按下錄音，瀏覽器請求麥克風權限。
3. 顯示錄音檔、回放按鈕、取消按鈕、送出按鈕。
4. 上傳 WAV 音檔到 Supabase Storage。
5. AI 分析音檔，產生該關卡對應分數、優點、待改善項目、練習建議。
6. 儲存結果後回到關卡頁，使用者可再挑戰或回首頁。

## 關卡設計

### 第一關：音準挑戰

任務說明：Agent 根據使用者偏好產生 5 個音符，使用者聆聽後跟著唱，系統比對音準並評分。

評分重點：
- 每個音符根據偏差程度給分（cents 偏差越小分數越高）。
- 5 個音符各 10 分，滿分 50 分。

技術選型：
- **Tone.js**（前端）：用 `Tone.Synth` 播放 Agent 產生的音符，使用者可重複聆聽。
- **Pitchy**（後端，`analyzePitch` tool 內）：解析使用者錄音的 WAV，偵測演唱音高並與目標音符比對。

UI 內容：
- 聊天視窗（與第三關相同的 chat-based 介面）。
- Agent 回傳音符時，前端渲染音符卡片與「播放」按鈕，透過 Tone.js 合成播放。

Agent 工作流程：
1. 使用者進入關卡，Agent 詢問偏好（例如「想練高音還是低音？」「要簡單還是有挑戰？」）。
2. Agent 根據偏好選擇 5 個音符（例如 C4–C5 範圍），以結構化格式回傳（如 `["C4", "E4", "G4", "A4", "C5"]`）。
3. 前端偵測 Agent 回傳的音符資料，渲染音符卡片並透過 Tone.js 播放供使用者聆聽，可重複播放。
4. 使用者跟著唱並錄音，前端上傳音檔後將 public URL 傳入 chat。
5. Agent 呼叫 `analyzePitch` tool，傳入 `{ targetNotes: ["C4", "E4", "G4", "A4", "C5"], audioUrl: "https://..." }`。
6. `analyzePitch` tool 執行流程：
   a. 從 URL 下載使用者的 WAV 錄音。
   b. 解碼為 PCM samples（Float32Array）。
   c. 以滑動視窗（~2048 samples）執行 Pitchy `findPitch()`，取得每個 frame 的頻率與 clarity。
   d. 過濾低 clarity 的 frame（靜音 / 雜訊）。
   e. 將連續相近頻率的 frame 聚合為「音符事件」（取中位數頻率）。
   f. 丟棄過短的事件（voice crack、氣音），保留最穩定的 N 個音符事件。
   g. 按順序將偵測到的音符與目標音符對齊比較。
   h. 計算每個音符的 cents 偏差，判定 hit/miss，產生總分。
7. Tool 回傳結構化結果給 Agent：
   ```json
   {
     "results": [
       { "target": "C4", "detected": "C4", "centsOff": -5, "hit": true, "noteScore": 9 },
       { "target": "E4", "detected": "E4", "centsOff": 12, "hit": true, "noteScore": 8 },
       { "target": "G4", "detected": "F#4", "centsOff": -42, "hit": false, "noteScore": 4 }
     ],
     "score": 38
   }
   ```
8. Agent 根據結果給予個人化回饋（例如「你的 G4 偏低了，試試用更多氣息支撐」），並呼叫 `uploadScore({ scoreType: "pitch", score: 38 })` 寫入分數。
9. 使用者可再次挑戰或回首頁。

音符對齊策略（處理 edge cases）：
- **多唱音符**（偵測到 6 個，目標 5 個）：丟棄最短 / 最不穩定的事件，或取最佳 5 組對齊。
- **少唱音符**（偵測到 4 個，目標 5 個）：缺少的音符給 0 分。
- **節奏偏差**：以順序對齊，不依賴時間戳，使用者唱快唱慢皆可。
- **滑音（glissando）**：取該段穩定區間的中位數頻率。
- **破音**：合併時間與音高相近的片段。

計分規則：
- 每個音符滿分 10 分，根據 cents 偏差扣分：
  - ±10 cents 以內：10 分（excellent）
  - ±25 cents 以內：8 分（good）
  - ±50 cents 以內：5 分（fair）
  - 超過 ±50 cents：2 分（miss）
  - 未偵測到：0 分
- 5 個音符加總，滿分 50 分。

### 第二關：氣息控制挑戰

任務說明：Agent 給使用者一個目標音符，使用者盡可能穩定、持久地唱出該音。系統透過 Meyda 與 Pitchy 即時分析音訊特徵，評估氣息控制能力。

評分重點（滿分 50 分，四個維度）：

| 維度 | 滿分 | 使用的 Meyda / Pitchy 特徵 | 說明 |
|------|------|---------------------------|------|
| Clean Duration（有效持續時長） | 15 | RMS + ZCR + Spectral Flatness | 計算「乾淨有聲」的總秒數（排除靜音、氣音、雜訊段）。<3s=5, 3-5s=10, 5-8s=13, >8s=15 |
| Pitch Stability（音準穩定度） | 15 | Pitchy（cents 偏差）+ Chroma | 計算所有有聲 frame 與目標音符的 cents 偏差標準差。std<8=15, <15=12, <25=8, <40=5, ≥40=2 |
| Tone Quality（音色品質） | 10 | Spectral Flatness + Spectral Slope | 衡量氣息音與純淨音的比例。Spectral Flatness 越低=越乾淨=分數越高；Spectral Slope 偵測嘶聲/氣音退化。 |
| Volume Steadiness（音量穩定度） | 10 | RMS variance (或 Bark Loudness variance) | 計算有聲段 RMS 的變異係數 (CV)。CV<0.1=10, <0.2=8, <0.3=5, ≥0.3=2 |

技術選型：
- **Meyda**（前端即時 + 後端離線分析）：擷取 RMS、Spectral Flatness、Spectral Flux、Spectral Slope、ZCR、Loudness、Chroma 等特徵。
- **Pitchy**（後端 `analyzeLongTone` tool）：精確偵測每個 frame 的頻率與 cents 偏差。
- **Tone.js**（前端）：播放目標音符供使用者聆聽。

UI 內容：
- 聊天視窗（與其他關卡相同的 chat-based 介面）。
- Agent 回傳目標音符時，前端渲染音符卡片與「播放」按鈕（複用 NotePlayer 元件）。
- **即時視覺回饋面板**：錄音期間顯示 Meyda 即時分析結果：
  - 即時音高指示器（目前音高 vs 目標音符，偏高/偏低箭頭）。
  - RMS 音量曲線（即時折線圖，理想為水平線）。
  - 氣息品質指示燈（Spectral Flatness 映射為綠/黃/紅，綠=乾淨、紅=氣音過重）。
  - 已持續秒數計時器。

Agent 工作流程：
1. 使用者進入關卡，Agent 先問第一個問題——**音域**：「你的聲音比較高還是低？」（高/中/低）。
2. Agent 再問第二個問題——**發聲方式**：「想用哪種方式練習？Ah（開口）、Oo（圓唇）、還是 Hmm（哼唱）？」
   - **Ah**（開口）：喉嚨打開，最容易入門，適合初學者。
   - **Oo**（圓唇）：需要集中氣流，測試嘴型控制力，中等難度。
   - **Hmm**（哼唱）：閉口哼唱，氣息控制最容易但音色分析門檻不同。
3. Agent 根據兩項偏好選擇 1 個目標音符（低音域→A3、中音域→E4、高音域→A4），並將音符與發聲方式以結構化格式回傳（如 `{ "note": "E4", "vowel": "Oo" }`）。
4. 前端渲染音符卡片（含發聲方式提示）並透過 Tone.js 播放目標音符供使用者聆聽。
5. 使用者開始錄音，前端啟動 Meyda real-time extraction 並顯示即時回饋面板。
5. 使用者結束錄音，前端上傳 WAV 音檔後將 public URL 傳入 chat。
6. Agent 依序呼叫 4 個分析 tool：
   - `analyzeCleanDuration({ targetNote, audioUrl })` → 回傳 `{ cleanDurationSeconds, totalDurationSeconds, score, timeline }` 
   - `analyzePitchStability({ targetNote, audioUrl })` → 回傳 `{ meanCentsOff, stdCentsOff, score, timeline }` 
   - `analyzeToneQuality({ audioUrl })` → 回傳 `{ avgSpectralFlatness, avgSpectralSlope, breathinessOnsetSecond, score, timeline }` 
   - `analyzeVolumeSteadiness({ audioUrl })` → 回傳 `{ rmsCV, rmsMean, rmsStd, decayDetected, score, timeline }` 
7. 每個 tool 回傳結果中包含 `timeline` 陣列（每秒一筆摘要），供 Agent 產生**時間軸回饋**。
8. Agent 根據四項結果給予個人化回饋，例如：
   - 「你的音色在前 6 秒非常乾淨，但第 7 秒開始變得氣音很重——試試在氣快用完前換氣。」
   - 「音量在第 4 秒有明顯下降，練習腹式呼吸可以幫助維持穩定氣流。」
9. Agent 呼叫 `uploadScore({ scoreType: "stability", score: totalScore })` 將四項加總的總分寫入 DB。
10. 使用者可再次挑戰或回首頁。

Tool 回傳範例（`analyzeCleanDuration`）：
```json
{
  "cleanDurationSeconds": 7.2,
  "totalDurationSeconds": 9.5,
  "score": 13,
  "timeline": [
    { "second": 1, "status": "clean" },
    { "second": 2, "status": "clean" },
    { "second": 7, "status": "clean" },
    { "second": 8, "status": "breathy" },
    { "second": 9, "status": "silence" }
  ]
}
```

Tool 回傳範例（`analyzePitchStability`）：
```json
{
  "targetNote": "G4",
  "meanCentsOff": 3.2,
  "stdCentsOff": 11.5,
  "score": 12,
  "timeline": [
    { "second": 1, "centsOff": 2, "note": "G4" },
    { "second": 5, "centsOff": -18, "note": "F#4" },
    { "second": 8, "centsOff": 45, "note": "A4" }
  ]
}
```

### 第三關：歌曲表現分析

任務說明：請告訴 Agent 想唱的歌曲名稱，並跟著伴奏/無歌詞版錄一段歌聲。
評分重點：
- 節奏：是否跟伴奏拍點一致、是否搶拍或拖拍。
- 情感：歌詞咬字、句尾處理、強弱變化、情緒貼合度。
- 技巧：是否有顫音、轉音、真假聲轉換。

UI 內容：
- 聊天視窗

Agent 工作流程：
1. 使用者告訴 Agent 想唱的歌曲名稱。
2. Agent 呼叫 `searchYouTubeVideos` 搜尋該歌曲的伴奏／無歌詞版，回傳影片卡片供使用者練唱。
3. 使用者跟著伴奏練唱並錄音，前端上傳音檔後將 public URL 傳入 chat。
4. Agent 聆聽音檔，不知道歌曲名稱時呼叫 `searchByLyrics` 辨識歌曲與歌手，並請使用者確認。
5. Agent 分析節奏、情感表達、技巧，產生分數與回饋。
6. Agent 呼叫 `uploadScore` 工具（最多三次：`rhythm`、`expression`、`technique`）將分數寫入 DB。
7. Agent 串流回覆完整回饋：優點、待改善項目、練習建議。


### 排行榜

目的：增加遊戲感與回訪動機。

排行榜類型：
- 總分排行：五項分數加總，滿分 250。
- 單項排行：音準王、氣息控制王、節奏王等。

顯示欄位：
- 排名
- username
- 稱號
- 總分
- 五項分數
- 最近更新時間

隱私規則：
- MVP 可只顯示 username，不顯示錄音連結。
- 錄音預設只給本人與後端分析使用。

## Supabase 資料模型

設計原則：
- MVP 先用 `username` 建立輕量使用者身份，不依賴 Supabase Auth。
- MVP 只保留 `users` 與 `recordings` 兩張 table，先不存挑戰紀錄與完整 AI 分析結果。
- 五項歷史最高分直接存回 `users`，Supabase 支援用 `update` 或 `upsert` 更新 row。
- `recordings` 只存音檔資訊，讓 AI 分析時可取得音檔 URL；排行榜不曝光錄音連結。
- Storage bucket 先沿用 public URL，方便內部 demo 測試。

### `users`

用途：代表一位練習者，目前以 username 登入或續用身份，並直接保存 MVP 需要顯示的最高分。

| 欄位 | 型別 | 約束 / 預設 | 說明 |
| --- | --- | --- | --- |
| `id` | uuid | primary key, default `gen_random_uuid()` | 使用者 ID |
| `username` | text | not null, unique | 顯示名稱與登入識別，建議 trim 後存入 |
| `title` | text | not null, default `大音痴是你` | 目前稱號，可由總分即時計算或快取 |
| `score_pitch` | integer | not null, default `0`, check between 0 and 50 | 音準歷史最高分 |
| `score_stability` | integer | not null, default `0`, check between 0 and 50 | 氣息控制歷史最高分 |
| `score_rhythm` | integer | not null, default `0`, check between 0 and 50 | 節奏歷史最高分 |
| `score_expression` | integer | not null, default `0`, check between 0 and 50 | 情感歷史最高分 |
| `score_technique` | integer | not null, default `0`, check between 0 and 50 | 技巧歷史最高分 |
| `created_at` | timestamptz | not null, default `now()` | 建立時間 |
| `updated_at` | timestamptz | not null, default `now()` | 更新時間 |

索引：
- `unique index users_username_key on users (lower(username))`：避免大小寫造成重複。
- `index users_Pitch_score_idx on users (Pitch_score desc)`：音準單項排行使用。
- `index users_breath_control_score_idx on users (breath_control_score desc)`：氣息控制單項排行使用。
- `index users_rhythm_score_idx on users (rhythm_score desc)`：節奏單項排行使用。
- `index users_expression_score_idx on users (expression_score desc)`：情感單項排行使用。
- `index users_technique_score_idx on users (technique_score desc)`：技巧單項排行使用。

### `recordings`

用途：儲存每次錄音檔案資訊。MVP 只保留音檔本身與使用者歸屬，不在錄音表記錄關卡類型。

| 欄位 | 型別 | 約束 / 預設 | 說明 |
| --- | --- | --- | --- |
| `id` | uuid | primary key, default `gen_random_uuid()` | 錄音 ID |
| `user_id` | uuid | not null, references `users(id)` on delete cascade | 錄音擁有者 |
| `storage_path` | text | not null, unique | Supabase Storage path |
| `public_url` | text | nullable | 內部 demo 用 public URL，方便 AI 分析與前端播放 |
| `file_size` | integer | nullable, check `file_size > 0` | 檔案大小 |
| `mime_type` | text | nullable | 例如 `audio/wav` |
| `duration_seconds` | numeric(8,2) | nullable, check `duration_seconds > 0` | 錄音秒數 |
| `created_at` | timestamptz | not null, default `now()` | 上傳時間 |

索引：
- `index recordings_user_id_created_at_idx on recordings (user_id, created_at desc)`。

分數更新策略：
- AI 分析完成後，後端取得本次分數，但不另存分析結果。
- 只在本次分數高於 `users` 既有單項分數時更新該欄位。
- 更新任一單項後，後端用五項分數即時計算總分與稱號；`title` 可選擇同步更新。
- 缺點是無法顯示歷史進步曲線或回看每次 AI 回饋；若未來需要，再新增 `challenge_attempts`。

稱號計算：
- `0–50`：大音痴是你
- `51–100`：愛唱歌的路人
- `101–150`：KTV模範生
- `151–220`：麥克風稱霸者
- `221–250`：天籟之音

### 權限策略

內部 demo：
- 前端不直接寫 Supabase DB，所有建立使用者、上傳錄音、更新分數都走 Next.js API route。
- API route 負責驗證 username 長度、userId、分數範圍與可更新欄位。
- 排行榜只回傳 `users` 的 username、title 與分數欄位，不回傳錄音 URL。

## API 設計

共通規則：
- Base path：`/api`
- Response JSON 時間格式一律使用 ISO 8601。
- 成功回傳 `{ "data": ... }`；失敗回傳 `{ "error": { "code": string, "message": string } }`。
- 五項分數 key：`Pitch`、`breath_control`、`rhythm`、`expression`、`technique`，每項 `0–50`。

### `POST /api/login`

用途：輸入 username 後建立或續用使用者。

Request：

```json
{
	"username": "Bertha"
}
```

Validation：
- `username` trim 後長度 2–20。

Response：

```json
{
	"data": {
		"user": {
			"id": "uuid",
			"username": "Bertha",
			"title": "愛唱歌的路人"
		},
		"scores": {
			"Pitch": 0,
			"breath_control": 0,
			"rhythm": 0,
			"expression": 0,
			"technique": 0,
			"total": 0
		}
	}
}
```

### `GET /api/users/{userId}`

用途：挑戰關卡首頁讀取右上角使用者資訊、五項最高分與稱號。

Path：
- `userId`: required。

Response：

```json
{
	"data": {
		"id": "uuid",
		"username": "Bertha",
		"title": "KTV模範生",
		"scores": {
			"Pitch": 42,
			"breath_control": 38,
			"rhythm": 40,
			"expression": 35,
			"technique": 37,
			"total": 192
		}
	}
}
```

### `POST /api/upload-audio`

用途：上傳 WAV 音檔到 Supabase Storage 並建立 `recordings` row。此 API 已存在，建議擴充欄位。

Content-Type：`multipart/form-data`

Form fields：
- `file`: required, WAV audio file。
- `userId`: required，登入後傳入。
- `durationSeconds`: optional。

Response：

```json
{
	"data": {
		"recordingId": "uuid",
		"url": "https://...",
		"storagePath": "user-id/recording-id.wav"
	}
}
```

### `GET /api/leaderboard?type={type}`

用途：排行榜頁讀取總分排行或單項排行。

Query：
- `type`: required，可為 `total`、`Pitch`、`breath_control`、`rhythm`、`expression`、`technique`。
- `limit`: optional, default `50`, max `100`。

Response：

```json
{
	"data": {
		"type": "total",
		"items": [
			{
				"rank": 1,
				"userId": "uuid",
				"username": "Bertha",
				"title": "麥克風稱霸者",
				"scores": {
					"Pitch": 45,
					"breath_control": 43,
					"rhythm": 44,
					"expression": 42,
					"technique": 41,
					"total": 215
				}
			}
		]
	}
}
```

### `POST /api/chat`

用途：AI 聊天、歌曲辨識、伴奏搜尋與第三關 MVP 音檔分析。此 API 已存在並使用 Vercel AI SDK streaming。

目前行為：
- Request 由 `useChat` 傳入 `{ messages }`。
- 若 user message parts 包含 `file.url`，後端會附加 `Audio file URL: ...` 文字給模型。
- 回傳 `toUIMessageStreamResponse`，前端顯示文字與工具結果。

工具清單：
- `searchByLyrics`：以歌詞搜尋 KKBOX 歌曲。
- `searchYouTubeVideos`：搜尋 YouTube 練唱伴奏影片。
- `uploadScore`：agent 分析錄音產生分數後，直接在 tool 內呼叫 Supabase DB 更新分數（不透過 HTTP fetch），邏輯同 `POST /api/scores`。

設計原則：
- 所有關卡的評分流程都在 `/api/chat` 的 agent 對話中完成，agent 分析完音檔後透過 `uploadScore` tool 直接寫入分數。
- `/api/chat` 同時作為自由問答、找歌、找伴奏與教練對話的入口。
- 前端透過 `useChat({ body: { userId } })` 將 `userId` 隨每次請求傳入，server 端從 request body 取得 `userId` 注入 tool context，`uploadScore` tool schema 不包含 `userId` 參數。

## 建議實作順序

1. 建立 `users`，包含 username、五項最高分與稱號欄位。
2. 實作 `POST /api/login` 與 `GET /api/users/{userId}`，完成登入頁與首頁右上角資訊。
3. 建立或補齊 `recordings` 欄位。
4. 擴充 `POST /api/upload-audio` 回傳 `recordingId` 並支援 `userId`。
5. 實作 `POST /api/scores`，接收 username、scoreType、score 並更新 `users` 最高分與稱號。
6. 在 `lib/tools.ts` 新增 `uploadScore` tool，內部呼叫 `POST /api/scores`，讓 agent 在對話中自行決定何時上傳分數。
7. 實作 `GET /api/leaderboard`，直接從 `users` 讀取五項分數並在 API 端計算總分排序。