# 日本每日內容雷達

公開專區：https://thxmama0601.github.io/travel-radar/japan-daily/

`public/japan-daily/` 是獨立靜態專區，Vite 在建置時複製進 `dist-pages/japan-daily/`。首頁在既有新聞快訊上方加入入口；既有 08:00 新聞快照排程維持原設定。

## 每日研究與發布

由 Codex 既有「日本每日內容雷達」排程每天 Asia/Taipei 12:00 開始研究，完成查核後將報告提交到本儲存庫；GitHub Actions 隨 main 分支提交建置並發布。此專區不會從 RSS 標題自動產生評分或假裝完成交叉查證。

Codex 的研究排程需要其執行環境及已授權的 GitHub 連線可用。GitHub Pages 持續提供最近成功發布的報告，並不代表每天必定已更新。首頁明列報告日期及搜尋截止時間。

## 資料格式

1. 每份 UTF-8 JSON 存在 `public/japan-daily/reports/YYYY-MM-DD.json`。
2. 同一提交更新 `public/japan-daily/reports/manifest.json`，其 `reports` 陣列保存 `{ "date": "YYYY-MM-DD", "title": "當日首選名稱" }`。保留舊日期；當日重跑更新同一日期，勿重複加入。
3. 報告未完成時維持清單空白或保留上一份，不放示例新聞。
4. 頁面會使用最新日期；指定 `?date=YYYY-MM-DD` 可分享歷史報告。

### 報告欄位

| 欄位 | 型別／內容 |
| --- | --- |
| date | YYYY-MM-DD |
| cutoff | 完整搜尋截止日期、時間、Asia/Taipei 與對應日本時間 |
| trends | 5～10 個字串，對應今天重要趨勢 |
| choice | title、score、reason、versusSecond、publishAt、audience、lifecycle |
| top10 | 1～10 個物件，欄位為 title、region、category、announcementDate、eventDate、score、why、sources |
| sources | 物件陣列：label、url，連到實際核對的原始來源頁 |
| threads | 1～5 個字串，完整可發布的分串草稿 |
| angles | 5 個物件：name、opening |
| images | 物件陣列：description、url |
| extensions | 字串陣列，適用時標示「可延伸商業內容」 |
| followups | 3～5 個物件：title、next、sources |
| fullText | 完整繁體中文每日報告，包含所有規定欄位、15～30 題候選池、八項分數、星等、時效、風險、未入選原因與來源 |

摘要卡片不取代完整報告。`fullText` 使用純文字，來源可以寫成 `[來源名稱](https://...)`，頁面會安全呈現成可點擊連結。JSON 中所有日期與金額應已完成查核；不足候選數時保留實際數目並說明原因。

## 發布檢查

- 在寫檔前先同步 main，檢查是否有使用者或其他程序尚未提交的變更。
- 只提交本次報告及 manifest，勿把本機憑證、日誌或研究暫存提交到公開儲存庫。
- 確認 JSON 可解析、日期一致、來源網址有效、分數加總正確。
- 執行 `npm run build:pages`，確認報告進入 `dist-pages/japan-daily/reports/`。
- 推送後確認 Actions 發布結果及公開頁面的報告日期。只有確認成功才回報已更新；若權限或部署失敗，保留檔案並在原對話說明。
