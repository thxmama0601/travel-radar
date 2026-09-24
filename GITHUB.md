# GitHub Pages 與背景更新

網站位於 https://thxmama0601.github.io/travel-radar/ 。僅上傳本專案，不包含外層影音工作室、憑證、相依套件或本機執行紀錄。

## 設定

1. 將程式放在公開 `travel-radar` 儲存庫的 `main` 預設分支。
2. Settings → Pages → Build and deployment → Source 選 **GitHub Actions**。
3. Actions → **Update news and publish website** → Run workflow。
4. 確認 refresh 與 deploy 工作成功，再打開 Pages 網址確認實際資料。

## 排程行為

每日台灣時間早上 08:00（UTC 00:00）排程執行，另於推送 main 或手動執行時更新。排程使用 GitHub 自帶的權杖，不需儲存個人 API key。refresh 工作只取得提交新聞快照的 contents:write；deploy 工作取得發布 Pages 所需 pages:write、id-token:write。

同一工作流程會依序抓取、保存 `public/data/news.json`、測試、建置與發布，避免依賴機器人提交再次觸發工作流程。來源全數失敗仍會發布保留資料與失敗狀態，並在執行紀錄標示警告；建置或部署失敗會呈現失敗狀態。

來源失敗保留上次成功資料，移除超過 7 天的備援文章。頁面顯示抓取時間、來源最後成功時間及文章原始發布時間，快照超過 26 小時會提示。重新整理只讀取最近完成的網站資料，不代表重新抓取來源。

GitHub 排程可能延遲或略過，公開儲存庫長時間無活動時可能停用排程。請參閱 [GitHub 排程文件](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。若有精準時間保證需求，需另接具服務等級承諾的排程服務。

## 本機檢查

```sh
npm ci
npm test
npm run collect:news
npm run build:pages
```

Windows 若需要使用系統憑證，可用 `node --use-system-ca scripts/collect-news.mjs`。靜態输出在 `dist-pages`，本機 API 版本使用 `npm run dev`。

頁面僅供個人非商業新聞閱讀。品牌優惠來自新聞索引，不保證完整促銷資訊或即時房價。

網頁每 1 分鐘讀取已發布的快照，回到分頁時立即同步；請分辨來源抓取時間與本頁同步時間。手動同步不會觸發 GitHub 工作流程。

