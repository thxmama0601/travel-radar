import { REFRESH_INTERVAL_MS } from './news-config.mjs';
export const TTL = REFRESH_INTERVAL_MS;
export const feeds = [
  ...[
    ['kkday','KKday','KKday',/kkday/i],
    ['klook','Klook','(Klook OR 客路)',/klook|客路/i],
    ['booking','Booking.com','(Booking.com OR Booking)',/\bbooking(?:\.com)?\b/i],
    ['trip','Trip.com','("Trip.com" OR 攜程)',/trip\.com|攜程/i],
    ['eztravel','易遊網','(易遊網 OR ezTravel)',/易遊網|\beztravel\b/i],
  ].map(([id,name,term,brandPattern])=>({id:`${id}-deals`,name:`${name} 優惠`,kind:'search',acceptAll:true,brandPattern,query:`${term} (優惠 OR 折扣 OR 折扣碼 OR 促銷 OR 回饋 OR 特價) when:7d`,note:'品牌優惠新聞搜尋，保留原發布媒體；非品牌官方 RSS，也非即時房價或庫存。可能延遲或漏收，優惠條件請查原文。'})),
  {id:'ettoday-travel',name:'ETtoday 旅遊雲',publisher:'ETtoday 旅遊雲',kind:'direct',acceptAll:true,url:'https://feeds.feedburner.com/ettoday/travel',note:'ETtoday 官方訂閱頁提供的旅遊 RSS。'},
  {id:'jnto',name:'日本政府觀光局 JNTO',publisher:'日本政府觀光局 JNTO',region:'日本',kind:'direct',acceptAll:true,official:true,url:'https://www.jnto.go.jp/news/rss.xml',note:'日文官方公告，包含統計、活動、招募等；不等同日本觀光廳或國稅廳的政策公告。'},
  {id:'cw-rss',name:'天下雜誌（舊 RSS）',publisher:'天下雜誌',kind:'direct',url:'https://www.cw.com.tw/RSS/cw_content.xml',note:'2026/09/23 驗證時最新文章為 2021/09/29；保留狀態檢查，舊文不列入最新消息。'},
  {id:'supertaste-search',name:'食尚玩家',publisher:'食尚玩家',kind:'search',acceptAll:true,sourceHost:'supertaste.tvbs.com.tw',query:'site:supertaste.tvbs.com.tw when:7d',note:'尚未驗證官方 RSS，使用 Google 新聞網站限定索引，可能延遲或漏收。'},
  {id:'cw-search',name:'天下雜誌（新聞搜尋）',publisher:'天下雜誌',kind:'search',sourceHost:'www.cw.com.tw',query:'site:www.cw.com.tw (旅遊 OR 觀光 OR 退稅 OR 優惠 OR 交通 OR 入境) when:7d',note:'舊 RSS 目前無近期文章，透過 Google 新聞補充旅遊相關標題，不讀取付費全文。'},
  {id:'jp-news',name:'日本旅遊與政策',region:'日本',query:'日本 (旅遊 OR 觀光 OR 退稅 OR 入境 OR 簽證) when:7d'},
  {id:'jp-deals',name:'日本交通與優惠',region:'日本',query:'日本 (機票 OR 飯店 OR 住宿 OR 新幹線) (優惠 OR 促銷 OR 特價 OR 免費 OR 新制) when:7d'},
  {id:'tw-news',name:'台灣旅遊與政策',region:'台灣',query:'台灣 (旅遊 OR 觀光 OR 入境 OR 國旅) when:7d'},
  {id:'tw-deals',name:'台灣交通與優惠',region:'台灣',query:'台灣 (旅遊 OR 機票 OR 飯店 OR 住宿 OR 高鐵) (優惠 OR 促銷 OR 特價 OR 補助) when:7d'},
  {id:'kr-news',name:'韓國旅遊與政策',region:'韓國',query:'韓國 (旅遊 OR 觀光 OR 入境 OR 退稅 OR 簽證) when:7d'},
  {id:'kr-deals',name:'韓國交通與優惠',region:'韓國',query:'韓國 (機票 OR 飯店 OR 住宿 OR 交通) (優惠 OR 促銷 OR 特價 OR 免費 OR 新制) when:7d'},
];
function decode(text) {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp);/gi, (all,n,named)=>{
    if(n){const value=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return value>0&&value<=0x10ffff?String.fromCodePoint(value):'';}
    return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[named.toLowerCase()]||all;
  }).trim();
}
function field(xml,name){return decode(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]??'');}
export function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function inferRegions(title,fallback){
  if(fallback)return [fallback];
  const found=[];
  if(/日本|東京|大阪|京都|九州|沖繩|北海道|福岡|鹿兒島|新潟|富士|名古屋|札幌|奈良|廣島|四國|關西|關東|日韓|赴日|遊日/.test(title))found.push('日本');
  if(/韓國|首爾|釜山|濟州|仁川|日韓|赴韓|遊韓/.test(title))found.push('韓國');
  if(/台灣|臺灣|台北|臺北|新北|桃園|新竹|苗栗|台中|臺中|彰化|南投|雲林|嘉義|台南|臺南|高雄|屏東|宜蘭|花蓮|台東|臺東|澎湖|金門|馬祖|基隆|國旅|北投|淡水/.test(title))found.push('台灣');
  return found.length?found:['其他／未判定'];
}
export function feedUrl(feed){return feed.url??`https://news.google.com/rss/search?q=${encodeURIComponent(feed.query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;}
export function latestPublication(xml){const dates=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m=>Date.parse(field(m[1],'pubDate'))).filter(n=>Number.isFinite(n)&&n<=Date.now()+300000);return dates.length?new Date(Math.max(...dates)).toISOString():null;}
export function classify(title){
  if(/退稅|免稅|入境|簽證|新制|新規|規定|政策|旅遊警示|旅遊警告|K-ETA/i.test(title))return '政策';
  if(/優惠|促銷|特價|折扣|免費|補助|折起|折券|早鳥|買[一1]送[一1]|省\d|狂折|激殺|下殺/.test(title))return '優惠';
  if(/機票|航班|航空|航線|新幹線|鐵路|高鐵|機場|交通|列車|鐵道|罷工/.test(title))return '交通';
  return '旅遊';
}
export function parseFeed(xml,feed,now=Date.now()){
  if(!/<rss[\s>]/i.test(xml)||!/<channel[\s>]/i.test(xml))throw new Error('Invalid RSS');
  const items=[];
  for(const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)){
    const row=match[1];const originalPublisher=field(row,'source');const publisher=feed.publisher||originalPublisher||'來源未提供';
    if(feed.sourceHost){try{const host=new URL(row.match(/<source[^>]*\burl=["']([^"']+)["']/i)?.[1]??'').hostname;if(host!==feed.sourceHost&&!host.endsWith('.'+feed.sourceHost))continue;}catch{continue;}}
    let title=field(row,'title');const suffix=` - ${originalPublisher||publisher}`;if(title.endsWith(suffix))title=title.slice(0,-suffix.length);
    const url=safeUrl(field(row,'link'));const parsed=Date.parse(field(row,'pubDate'));
    if(!title||!url||title.length>1000)continue;
    if(feed.brandPattern&&!feed.brandPattern.test(title))continue;
    if(!feed.acceptAll&&!/旅遊|觀光|旅行|旅客|遊客|退稅|免稅|入境|簽證|機票|住宿|飯店|酒店|航班|航空|機場|航線|新幹線|鐵路|高鐵|列車|鐵道|景點|自由行|周遊券|Klook|KKday|Trip\.com|JR.?PASS|K-ETA|迪士尼|環球影城|溫泉|出國|國旅|出境|通關|護照|賞楓|賞櫻|九州|沖繩|富士山/i.test(title))continue;
    if(Number.isFinite(parsed)&&(parsed<now-7*86400000||parsed>now+300000))continue;
    items.push({id:url,title,url,publisher,publishedAt:Number.isFinite(parsed)?new Date(parsed).toISOString():null,regions:inferRegions(title,feed.region),category:feed.official?'官方公告':classify(title),sourceIds:feed.id?[feed.id]:[],sourceKind:feed.kind??'search'});
  }
  return items.slice(0,100);
}
export function deduplicate(items){
  const map=new Map();
  for(const item of items){const key=item.title.normalize('NFKC').replace(/[\s\p{P}]/gu,'').toLowerCase();const old=map.get(key)||[...map.values()].find(i=>i.url===item.url);
    if(old){const regions=[...new Set([...old.regions,...item.regions])];const sourceIds=[...new Set([...(old.sourceIds??[]),...(item.sourceIds??[])])];if(item.sourceKind==='direct'&&old.sourceKind!=='direct')Object.assign(old,item);old.regions=regions;old.sourceIds=sourceIds;continue;}map.set(key,{...item,regions:[...item.regions],sourceIds:[...(item.sourceIds??[])]});}
  return [...map.values()].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0));
}
export function createCollector(fetcher=fetch,selectedFeeds=feeds,previousPayload=null){
  const snapshots=new Map();let pending=null;let checked=0;let cached=null;
  // Scheduled runs start in a fresh process. Restore dated data only for failure fallback.
  for(const feed of selectedFeeds){
    const source=previousPayload?.sources?.find(s=>s.id===feed.id);
    if(!source?.lastSuccessAt)continue;
    const items=(previousPayload?.items??[]).filter(i=>i.sourceIds?.includes(feed.id)&&safeUrl(i.url)&&i.publishedAt&&Date.parse(i.publishedAt)>=Date.now()-7*86400000&&Date.parse(i.publishedAt)<=Date.now()+300000);
    snapshots.set(feed.id,{items,lastSuccessAt:source.lastSuccessAt,latestPublishedAt:source.latestPublishedAt??null});
  }
  async function collect(){
    const checkedAt=new Date().toISOString();
    const results=await Promise.all(selectedFeeds.map(async feed=>{
      const meta={id:feed.id,name:feed.name,kind:feed.kind??'search',url:feedUrl(feed),note:feed.note??'Google 新聞地區查詢頻道，並非媒體官方 RSS。'};
      try{
        const url=feedUrl(feed);
        const r=await fetcher(url,{headers:{Accept:'application/rss+xml, application/xml, text/xml','User-Agent':'TravelRadar/1.0 (personal RSS reader)'},signal:AbortSignal.timeout(12000)});
        if(!r.ok)throw new Error(`Source status ${r.status}`);
        const xml=await r.text();if(xml.length>2000000)throw new Error('Feed too large');
        const items=parseFeed(xml,feed);const latestPublishedAt=latestPublication(xml);const snapshot={items,lastSuccessAt:new Date().toISOString(),latestPublishedAt};snapshots.set(feed.id,snapshot);
        const inactive=latestPublishedAt&&Date.parse(latestPublishedAt)<Date.now()-7*86400000;
        return {items,status:{...meta,status:inactive?'inactive':'ok',lastSuccessAt:snapshot.lastSuccessAt,latestPublishedAt,count:items.length}};
      }catch(error){
        console.warn(`[news:${feed.id}] ${error?.message??'Source unavailable'}${error?.cause?.code?' ('+error.cause.code+')':''}`);
        const previous=snapshots.get(feed.id);const items=(previous?.items??[]).filter(i=>i.publishedAt&&Date.parse(i.publishedAt)>=Date.now()-7*86400000);
        return {items,status:{...meta,status:previous?'stale':'error',lastSuccessAt:previous?.lastSuccessAt??null,latestPublishedAt:previous?.latestPublishedAt??null,count:items.length}};
      }
    }));
    cached={items:deduplicate(results.flatMap(r=>r.items)),sources:results.map(r=>r.status),checkedAt};checked=Date.now();return cached;
  }
  return async function(){if(cached&&Date.now()-checked<TTL)return cached;if(pending)return pending;pending=collect();try{return await pending;}finally{pending=null;}};
}
export const getNews=createCollector();
