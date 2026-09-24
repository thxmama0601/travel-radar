import { getNews } from "@/lib/news-feed.mjs";
export const dynamic="force-dynamic";
export async function GET(){
  try{return Response.json(await getNews(),{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}
  catch{return Response.json({error:"新聞更新失敗"},{status:503});}
}
