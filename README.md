# CC三寶媽-旅遊雷達

繁體中文個人旅遊新聞閱讀平台，日本優先，兼顧台灣與韓國。

- 網站：https://thxmama0601.github.io/travel-radar/
- 原始碼：https://github.com/thxmama0601/travel-radar

## 功能

- ETtoday 旅遊雲、JNTO 官方 RSS；食尚玩家、天下雜誌的新聞搜尋索引。
- KKday、Klook、Booking.com、Trip.com 品牌優惠新聞與獨立篩選按鈕。
- 地區、分類、媒體與標題搜尋，近 24 小時、3 天或 7 天篩選。
- 去除重複標題與連結、保留原媒體及實際發布日期。
- GitHub Actions 每小時第 17、47 分抓取，保存 JSON 並部署 GitHub Pages；電腦關閉後仍運作。
- 來源失敗時保留近 7 天已取得內容，顯示狀態；快照超過 90 分鐘顯示提醒。

## 本機啟動

需要 Node.js 24：

```sh
npm ci
npm run dev
```

開啟 http://localhost:5173/ 。Windows 可雙擊 `Start-TravelRadar.cmd`。

本機版本透過 `/api/news` 抓取來源並快取 30 分鐘。公開網站只讀取 `data/news.json`，由 GitHub Actions 背景更新，重新整理不會強制執行雲端抓取。

```sh
npm run collect:news
npm run build:pages
npm test
```

`dist-pages` 為可上傳至靜態主機的版本，使用相對路徑支援 GitHub Pages 子目錄。部署設定見 [GITHUB.md](GITHUB.md)。

## 來源與限制

共 15 個來源頻道，包括 4 個品牌優惠查詢、5 個指定媒體／官方來源與 6 個地區查詢。

品牌優惠透過 Google 新聞索引搜尋，並非四個平台的官方 RSS、完整促銷目錄或即時房價 API；保留原媒體名稱。ETtoday 與 JNTO 直接讀官方 RSS；JNTO 公告為日文，包含統計、活動及招募，並非日本觀光廳或國稅廳的政策 RSS。天下舊 RSS 在 2026/09/23 驗證時最新文章為 2021/09/29，因此另以搜尋索引補充近期標題。

每個來源最多 100 則，只收錄近 7 天；沒有發布日期的文章明確標示。索引及排程可能延遲或漏收。發布時間不代表優惠有效期，分類及地區推斷可能誤判，請依原始公告確認。日本退稅重點為人工維護提醒。

只顯示標題與連結，不抓取付費全文。Google 新聞 RSS 供個人非商業閱讀，其他來源依各自條款使用；商業營運需改接授權來源。沒有推播、優惠到期解析或歷史資料庫。

## 主要檔案

- `app/news-dashboard.tsx`：共用操作介面。
- `github/main.tsx`、`vite.github.config.ts`：GitHub Pages 靜態入口。
- `lib/news-feed.mjs`：來源、RSS 解析、分類、去重與快取。
- `scripts/collect-news.mjs`：排程抓取、舊資料備援與原子寫入。
- `.github/workflows/refresh-news.yml`：背景更新、建置與發布。
- `tests/`：RSS、日期、來源驗證、品牌篩選及跨次執行備援測試。
