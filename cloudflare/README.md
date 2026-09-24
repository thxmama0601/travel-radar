# 獨立雲端排程（尚未部署）

此 Worker 每日台灣時間早上 08:00（UTC 00:00）呼叫既有 GitHub Actions 工作流程，抓取新聞、保存資料並更新原本的 GitHub Pages 網址。RSS 解析仍由 GitHub 執行，Cloudflare 只負責發出一個排程請求。兩個服務仍可能發生延遲或故障，不保證準點或不中斷。

## 啟用前需要

1. 使用者自己的 Cloudflare 帳號，使用 Workers Free 方案，不建立付費訂閱。
2. 使用者自行建立 GitHub fine-grained personal access token：只選 `thxmama0601/travel-radar` 儲存庫，Repository permissions → Actions: Read and write。不要授予其他儲存庫或內容寫入權限。
3. 將該權杖儲存為此 Cloudflare Worker 的加密 secret，名稱 `GITHUB_DISPATCH_TOKEN`。不要寫入程式、GitHub 儲存庫、一般環境變數或聊天。Cloudflare 會持有這個僅能操作指定儲存庫 Actions 的憑證，建立前需由使用者明確同意。

## 部署步驟

```sh
npx wrangler login
npx wrangler deploy --config cloudflare/wrangler.jsonc
npx wrangler secret put GITHUB_DISPATCH_TOKEN --config cloudflare/wrangler.jsonc
```

只有帳號完成登入、secret 設定完成、Worker 已部署且 cron 實際觸發成功後，才算啟用。Cron 設定同步可能需要數分鐘。

Cloudflare 排程穩定驗證後，再移除 GitHub workflow 的 `on.schedule`，保留 push 與 workflow_dispatch，避免兩套排程重複抓取。請同時查 Cloudflare 執行紀錄及 GitHub Actions 是否成功部署，HTTP /health 只證明 Worker 可連線。

權杖到期或撤銷後，排程呼叫會失敗；需在 Cloudflare secret 更新新權杖。前端仍會顯示資料過期提示。

## 本機驗證

```sh
node --test tests/cloud-scheduler.test.mjs
npx wrangler deploy --dry-run --config cloudflare/wrangler.jsonc
```

以上驗證不會啟用雲端排程。現有網站沒有切換到這套機制。
