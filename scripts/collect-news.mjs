import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCollector, feeds } from '../lib/news-feed.mjs';

const defaultOutput=fileURLToPath(new URL('../public/data/news.json',import.meta.url));

export async function refreshSnapshot({outputFile=defaultOutput,fetcher=fetch,selectedFeeds=feeds}={}){
  let previous=null;
  try{
    previous=JSON.parse(await readFile(outputFile,'utf8'));
    if(!Array.isArray(previous.items)||!Array.isArray(previous.sources))throw new Error('Invalid saved news snapshot');
  }catch(error){if(error.code!=='ENOENT')throw error;}
  const result=await createCollector(fetcher,selectedFeeds,previous)();
  const payload={schemaVersion:1,...result};
  await mkdir(path.dirname(outputFile),{recursive:true});
  const temporary=`${outputFile}.${process.pid}.tmp`;
  try{
    await writeFile(temporary,JSON.stringify(payload,null,2)+'\n','utf8');
    await rename(temporary,outputFile);
  }finally{await rm(temporary,{force:true});}
  const successful=result.sources.filter(s=>s.status==='ok'||s.status==='inactive');
  const failed=result.sources.filter(s=>s.status==='error'||s.status==='stale');
  return {payload,allFailed:successful.length===0,failed:failed.map(s=>s.name),outputFile};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{
    const result=await refreshSnapshot();
    console.log(JSON.stringify({output:result.outputFile,checkedAt:result.payload.checkedAt,articles:result.payload.items.length,sources:result.payload.sources.length,failedSources:result.failed}));
    if(result.allFailed){console.error('All news sources failed. Previous dated articles were retained where available.');process.exitCode=1;}
  }catch(error){console.error(`Unable to save news snapshot: ${error.message}`);process.exitCode=1;}
}
