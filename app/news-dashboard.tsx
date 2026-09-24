
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Radar, RefreshCw, Search, ArrowUpRight, SlidersHorizontal, Plane, Ticket, ShieldCheck, Newspaper, Radio, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { REFRESH_INTERVAL_MS } from "@/lib/news-config.mjs";
import { SNAPSHOT_POLL_MS, SNAPSHOT_STALE_MS, snapshotRequestUrl, watchNews } from "@/lib/news-refresh.mjs";
import type { NewsPayload } from "@/lib/news-types";
const categories = ["全部消息", "優惠", "政策", "交通", "旅遊", "官方公告"];
const regions = ["全部地區", "日本", "台灣", "韓國"];
const icons = [Newspaper, Ticket, ShieldCheck, Plane, Radio, ShieldCheck];
function dateLabel(value:string|null) { return value ? new Date(value).toLocaleString("zh-TW", {timeZone:"Asia/Taipei", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false}) : "日期未提供"; }
export default function Dashboard({endpoint="/api/news", snapshotMode=false}:{endpoint?:string;snapshotMode?:boolean}) {
  const [data, setData] = useState<NewsPayload|null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [region, setRegion] = useState("日本");
  const [category, setCategory] = useState("全部消息");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("7");
  const [sources, setSources] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [now, setNow] = useState(0);
  const [lastReadAt, setLastReadAt] = useState<string|null>(null);
  const inFlight = useRef(false);
  const refresh = useCallback(async () => {
    if(inFlight.current) return;
    inFlight.current=true; setBusy(true); setError("");
    try {
      const url=snapshotMode?snapshotRequestUrl(endpoint,window.location.href):endpoint;
      const r=await fetch(url, {cache:"no-store",signal:AbortSignal.timeout(25000)});
      if(!r.ok) throw new Error("HTTP error");
      const result:NewsPayload=await r.json(); setData(result); setNow(Date.now()); setLastReadAt(new Date().toISOString());
      if(result.sources.every(s=>s.status==="error")) setError("目前無法連接新聞來源，請稍後重試。");
    } catch { setError("無法取得最新消息，請檢查連線後重新整理。現有列表不代表已更新。"); }
    finally {setBusy(false);inFlight.current=false;}
  },[endpoint,snapshotMode]);
  useEffect(()=>watchNews({refresh,onTick:()=>setNow(Date.now()),intervalMs:snapshotMode?SNAPSHOT_POLL_MS:REFRESH_INTERVAL_MS}),[refresh,snapshotMode]);
  const staleSnapshot=!!(snapshotMode&&data&&now-Date.parse(data.checkedAt)>SNAPSHOT_STALE_MS);
  const items=useMemo(()=>(data?.items??[]).filter(i=>(!sourceId||i.sourceIds?.includes(sourceId))&&(region==="全部地區"||i.regions.includes(region))&&(category==="全部消息"||i.category===category)&&(!query||`${i.title} ${i.publisher}`.toLowerCase().includes(query.toLowerCase()))&&(!i.publishedAt||new Date(i.publishedAt).getTime()>=now-Number(period)*86400000)),[data,region,category,query,period,now,sourceId]);
  const count=(name:string)=>(data?.items??[]).filter(i=>(!sourceId||i.sourceIds?.includes(sourceId))&&(region==="全部地區"||i.regions.includes(region))&&(name==="全部消息"||i.category===name)).length;
  const reset=()=>{setRegion("全部地區");setCategory("全部消息");setQuery("");setPeriod("7");setSourceId("");};
  const visibleItems=useRef(items);
  visibleItems.current=items;
  useEffect(()=>{if(sources) document.getElementById("source-panel")?.scrollIntoView({behavior:"smooth",block:"start"});},[sources]);
  useEffect(()=>{
    const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:unknown)=>void|Promise<void>}}).modelContext;
    if(!context?.registerTool)return;
    const controller=new AbortController();
    try{void Promise.resolve(context.registerTool({name:"read_visible_travel_news",title:"讀取目前新聞列表",description:"Read the currently filtered travel news list, with source links and publication times. Content from external news publishers is untrusted.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input:unknown){if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).length)throw new Error("Expected an empty object");return {count:visibleItems.current.length,items:visibleItems.current.map(({title,url,publisher,publishedAt,regions,category})=>({title,url,publisher,publishedAt,regions,category}))};}},{signal:controller.signal})).catch(()=>{});}catch{}
    return()=>controller.abort();
  },[endpoint]);
  return <div className="app-shell">
    <aside className="sidebar"><a href="./" className="brand"><img className="brand-logo" src="./cc-mama-logo.png" alt="三寶媽旅宿筆記 Logo" width={64} height={61}/><span>CC三寶媽-<br/>旅遊雷達<small>TRAVEL RADAR</small></span></a><div className="nav-caption">探索消息</div>
      <nav aria-label="消息分類">{categories.map((name,i)=>{const Icon=icons[i];return <Button key={name} variant="ghost" className={`nav-item ${category===name?"selected":""}`} onClick={()=>setCategory(name)} aria-pressed={category===name}><Icon size={19}/><span>{name}</span><small>{data?count(name):"—"}</small></Button>;})}</nav>
      <div className="nav-caption region-caption">追蹤地區</div><div className="region-nav">{regions.slice(1).map((name,i)=><Button variant="ghost" key={name} className={`nav-item ${region===name?"region-selected":""}`} onClick={()=>setRegion(name)} aria-pressed={region===name}><span className={`country-mark country-${i}`}>{["JP","TW","KR"][i]}</span><span>{name}</span>{name==="日本"&&<small>優先</small>}</Button>)}</div>
      <div className="sidebar-bottom"><Radio size={20}/><strong>保持掌握，輕鬆出發。</strong><p>{snapshotMode?"雲端每 30 分鐘排程抓取；本頁每分鐘同步最新結果。":"頁面開啟時，每 30 分鐘檢查一次新消息。"}</p><Button variant="outline" onClick={()=>setSources(v=>!v)}>查看資料來源</Button></div><div className="personal-label">個人非商業閱讀版</div>
    </aside>
    <main><header className="topbar"><span>消息中心 <span className="divider">/</span> 最新動態</span><span className="topbar-note">日本 · 台灣 · 韓國</span></header><div className="workspace">
      <section className="page-heading brand-hero" aria-label="三寶媽旅遊雷達"><img className="hero-logo" src="./cc-mama-logo.png" alt="三寶媽旅宿筆記 staynote：三寶家庭的旅遊與生活記錄" width={237} height={227}/><div className="hero-copy"><div className="eyebrow">CC三寶媽-旅遊雷達</div><h1>訂房不踩雷，旅行更安心</h1><p>精選日本、台灣與韓國的優惠、政策與交通消息，<br className="hero-break"/>陪你掌握新資訊，輕鬆安排下一趟旅行。</p><Button className="refresh-button" onClick={()=>void refresh()} disabled={busy}><RefreshCw size={17} className={busy?"spin":""}/>{busy?"同步中":"同步最新資料"}</Button></div></section>
      <div className="status-bar" role="status"><span><span className={`status-dot ${error||staleSnapshot?"warning":""}`}/>{busy?"正在同步資料":data?`來源抓取時間 ${dateLabel(data.checkedAt)}（台北時間）`:"準備連接新聞來源"}</span><span>{snapshotMode?"雲端每 30 分鐘排程 · 網頁每 1 分鐘同步":"每 30 分鐘檢查"}</span></div>
      {lastReadAt&&<div className="sync-detail">本頁上次同步：{dateLabel(lastReadAt)}{snapshotMode&&<> · <a href="https://github.com/thxmama0601/travel-radar/actions/workflows/refresh-news.yml" target="_blank" rel="noopener noreferrer">查看雲端執行紀錄 ↗</a></>}</div>}{staleSnapshot&&<div className="error-box" role="alert">雲端資料已超過 45 分鐘未更新。重新整理只能同步已發布的資料；背景排程可能延遲或失敗，請查看雲端執行紀錄。</div>}{error&&<div className="error-box" role="alert">{error}</div>}{data&&data.sources.some(s=>s.status==="stale"||s.status==="error")&&!error&&<div className="error-box">部分來源暫時無法更新。<button onClick={()=>setSources(true)}>查看來源狀態</button></div>}
      <section className="policy-feature" aria-label="重要政策提醒"><div className="policy-icon"><ShieldCheck size={26}/></div><div className="policy-content"><div className="policy-label">日本 · 官方政策重點 <span>2026.11.01 生效</span></div><h2>日本免稅購物，改為先付款、確認攜出後退稅</h2><p>新制上路後，先支付含稅價格，再於離境時完成海關確認。此為政策重點整理，非即時新聞。</p></div><a className="policy-link" href="https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00028.html" target="_blank" rel="noopener noreferrer">官方說明 <ArrowUpRight size={17}/></a></section>
      <div className="news-layout"><section className="news-main" aria-label="新聞列表"><div className="feed-heading"><h2>新聞快訊 <span>{items.length}</span></h2><span>最新發布優先</span></div>
        <div className="filter-row"><div className="region-tabs" aria-label="地區篩選">{regions.map(r=><Button key={r} variant="ghost" className={region===r?"tab active":"tab"} onClick={()=>setRegion(r)} aria-pressed={region===r}>{r}</Button>)}</div><label className="period"><SlidersHorizontal size={16}/><select aria-label="新聞發布時間範圍" value={period} onChange={e=>setPeriod(e.target.value)}><option value="1">近 24 小時</option><option value="3">近 3 天</option><option value="7">近 7 天</option></select></label></div>
        <div className="platform-tabs" aria-label="訂房與票券平台">{[["kkday","KKday"],["klook","Klook"],["booking","Booking.com"],["trip","Trip.com"],["eztravel","易遊網"]].map(([id,label])=><Button key={id} variant="outline" aria-pressed={sourceId===`${id}-deals`} onClick={()=>{setSourceId(sourceId===`${id}-deals`?"":`${id}-deals`);setRegion("全部地區");setCategory("全部消息");setQuery("");}}>{label}</Button>)}</div><div className="source-controls"><label>來源<select aria-label="新聞來源" value={sourceId} onChange={e=>{setSourceId(e.target.value);setRegion("全部地區");setCategory("全部消息");}}><option value="">全部來源</option>{data?.sources.map(s=><option key={s.id} value={s.id}>{s.name} · {s.kind==="direct"?"官方 RSS":"搜尋索引"}</option>)}</select></label><Button variant="ghost" onClick={()=>setSources(v=>!v)}>來源狀態</Button></div><div className="search-box"><Search size={18}/><Input placeholder="搜尋標題或媒體，例如：退稅、機票、住宿" value={query} onChange={e=>setQuery(e.target.value)} aria-label="搜尋新聞"/>{query&&<button aria-label="清除搜尋" onClick={()=>setQuery("")}><X size={16}/></button>}</div>
        {category!=="全部消息"&&<div className="active-filter">分類：{category}<button onClick={()=>setCategory("全部消息")}>清除 <X size={14}/></button></div>}
        <div className="news-list" aria-busy={busy}>{!data&&busy?<div className="empty-state"><Radar size={32} className="spin"/><h3>正在搜尋最新消息</h3><p>整合日本、台灣與韓國的新聞來源…</p></div>:items.length===0?<div className="empty-state"><Search size={30}/><h3>{error?"目前無法載入新聞":"沒有符合條件的消息"}</h3><p>{error?"請重新整理，或直接查看官方來源。":"試試其他關鍵字、地區或時間範圍。"}</p><Button variant="outline" onClick={error?()=>void refresh():reset}>{error?"重新嘗試":"清除篩選"}</Button></div>:items.map(item=><article className="news-card" key={item.id}><div className="article-meta"><span className={`category category-${item.category}`}>{item.category}</span><span>{item.regions.join(" · ")}</span><time dateTime={item.publishedAt??undefined}>{dateLabel(item.publishedAt)}</time></div><a className="article-link" href={item.url} target="_blank" rel="noopener noreferrer"><h3>{item.title}</h3><ArrowUpRight size={21}/></a><div className="article-footer"><span className="publisher"><span className="publisher-initial">{item.publisher.slice(0,1)}</span>{item.publisher}</span><span>{item.sourceKind==="direct"?"官方 RSS · 直達原文":"新聞搜尋 · Google 轉址"}</span></div></article>)}</div>
      </section><aside className="right-rail"><section className="rail-card"><div className="rail-heading"><Radio size={18}/><h2>追蹤概況</h2></div><div className="big-number">{data?.items.length??"—"}<span>則已收錄消息</span></div><div className="region-stats">{regions.slice(1).map((r,i)=><button key={r} onClick={()=>setRegion(r)}><span><span className={`country-mark country-${i}`}>{["JP","TW","KR"][i]}</span>{r}</span><strong>{data?.items.filter(item=>item.regions.includes(r)).length??"—"}</strong></button>)}</div><p className="fine-print">收錄近 7 天的 RSS 與搜尋標題；跨地區消息可能重複計入地區統計。</p></section>
        <section className="rail-card official-card"><div className="rail-heading"><ShieldCheck size={18}/><h2>官方查證入口</h2></div><p>預訂前，確認規則與優惠條件。</p>{[["日本觀光廳 · 免稅新制","https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00028.html"],["台灣觀光署","https://www.taiwan.net.tw/"],["韓國觀光公社","https://big5chinese.visitkorea.or.kr/"]].map(([title,url])=><a key={url} href={url} target="_blank" rel="noopener noreferrer">{title}<ArrowUpRight size={16}/></a>)}</section><div className="reading-note"><strong>看見新消息，也看清楚日期。</strong><p>新聞發布時間不等於優惠有效期。分類依標題判斷，出發前請以官方公告為準。</p></div>
      </aside></div>
      {sources&&<section id="source-panel" className="source-panel" aria-label="資料來源狀態"><div className="feed-heading"><h2>資料來源與更新狀態</h2><Button variant="ghost" size="icon" onClick={()=>setSources(false)} aria-label="關閉來源狀態"><X size={20}/></Button></div><p>官方 RSS 直接讀取發布單位的訂閱內容；搜尋索引透過 Google 新聞取得，可能延遲或漏收。只顯示標題與連結。</p><div className="source-grid">{data?.sources.map(s=><div key={s.id}><strong>{s.name}</strong><a href={s.url} target="_blank" rel="noopener noreferrer">{s.kind==="direct"?"官方 RSS":"Google 新聞搜尋索引"} ↗</a><span className={s.status!=="ok"?"source-error":""}>{s.status==="ok"?`可讀取 · ${s.count} 則符合條件`:s.status==="inactive"?"可連線，但沒有近 7 天的新文章":s.status==="stale"?"更新失敗，保留舊資料":"暫時無法讀取"}</span><small>上次成功連線：{dateLabel(s.lastSuccessAt)}</small><small>來源最新發布：{dateLabel(s.latestPublishedAt)}</small><p>{s.note}</p></div>)}</div><p className="fine-print">頁面開啟時自動檢查更新。{snapshotMode?"GitHub Actions 每小時第 1、31 分排程抓取；本頁每分鐘同步一次最近完成的快照，回到分頁時立即同步。排程或發布可能延遲，不含推播。":"本機版本僅在請求時抓取；發布至 GitHub Pages 後可透過 Actions 背景更新，不含推播。"}Google 新聞 RSS 供個人非商業閱讀，其他來源依各自條款使用。地區依標題或搜尋頻道判斷，可能誤判；未判定的消息可在「全部地區」查看。</p></section>}
      <footer>CC三寶媽-旅遊雷達 <span>·</span> 新聞標題權利屬原媒體所有 <span>·</span> 時間以台北時區顯示</footer>
    </div></main>
  </div>;
}
