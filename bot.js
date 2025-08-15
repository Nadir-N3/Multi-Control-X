#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import chalk from 'chalk';

const CONFIG_FILE = path.join(process.cwd(), 'konfiguration.json');
const COOKIE_DIR  = path.join(process.cwd(), 'X');
const TARGETS = {
  like:    path.join(process.cwd(), 'like.txt'),
  retweet: path.join(process.cwd(), 'retweet.txt'),
  follow:  path.join(process.cwd(), 'follow.txt'),
  unfollow:path.join(process.cwd(), 'unfollow.txt'),
  tweet:   path.join(process.cwd(), 'tweets.txt'),
  reply:   path.join(process.cwd(), 'replies.txt')
};

const HOSTS = ['x.com','twitter.com'];
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const rint  = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const within= (a,b)=>rint(a*1000,b*1000);
const shuf  = a=>a.sort(()=>Math.random()-0.5);
const log = { info:(s)=>console.log(chalk.yellow(s)), ok:(s)=>console.log(chalk.green(s)), warn:(s)=>console.warn(chalk.yellow(s)), err:(s)=>console.warn(chalk.red(s)), head:(s)=>console.log('\n'+chalk.bold(s)) };

function banner(){ const W=46; const line=(t)=>{ if(t.length>W) t=t.slice(0,W); const L=Math.floor((W-t.length)/2); const R=W-t.length-L; return `║${' '.repeat(L)}${t}${' '.repeat(R)}║`; }; console.log(chalk.cyan('╔'+ '═'.repeat(W) +'╗')); console.log(chalk.cyan(line('X DOM BOT - Multi-Account Actions'))); console.log(chalk.cyan(line('Like • Retweet • Follow • Unfollow • Reply'))); console.log(chalk.cyan(line('Developed by : Instagram @__naadiir.fx'))); console.log(chalk.cyan('╚'+ '═'.repeat(W) +'╝')); }

function readJSON(file){ const t=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').trim(); return JSON.parse(t); }
function readLines(file){ if(!fs.existsSync(file))return []; return fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean); }
function extractTweetId(u){ const m=String(u).match(/status\/(\d+)/); return m?m[1]:null; }
function extractScreen(u){ const m=String(u).match(/(?:x|twitter)\.com\/([A-Za-z0-9_]+)/i); return m?m[1]:null; }
function parseReplyLine(line){ const i=line.indexOf('|'); if(i===-1) return {url:line.trim(), text:''}; return {url:line.slice(0,i).trim(), text:line.slice(i+1).trim()}; }
function samesite(v){ const m={lax:'Lax',no_restriction:'None',unspecified:'None'}; return m[v]||'Lax'; }
function cookieForUrl(c,host){ return { name:c.name, value:c.value, url:`https://${host}${c.path||'/'}`, httpOnly:!!c.httpOnly, secure:true, sameSite:samesite(c.sameSite), expires:c.expirationDate?Math.floor(c.expirationDate):undefined }; }
function normalizeCfg(c){ const o={},t=c.toggles||{},d=c.delays||{}; o.like='like'in c?!!c.like:!!t.like; o.retweet='retweet'in c?!!c.retweet:!!t.retweet; o.follow='follow'in c?!!c.follow:!!t.follow; o.unfollow='unfollow'in c?!!c.unfollow:!!t.unfollow; o.tweet='tweet'in c?!!c.tweet:!!t.tweet; o.reply='reply'in c?!!c.reply:!!t.reply; o.delayMin='delayMin'in c?+c.delayMin:+(d.min_seconds??8); o.delayMax='delayMax'in c?+c.delayMax:+(d.max_seconds??18); o.cooldownBetweenAccounts='cooldownBetweenAccounts'in c?+c.cooldownBetweenAccounts:+(d.cooldown_between_accounts_seconds??15); o.perAccount=+(c.per_account_limit??c.perAccount??5); o.emulateMobile=!!(c.emulate_mobile??c.emulateMobile); o.userAgent=c.user_agent??c.userAgent??''; o.autoCreateTargetFiles=!!(c.auto_create_target_files??c.autoCreateTargetFiles??true); o.maxRetries=+(c.maxRetries??3); return o; }

async function setCookiesUrlBased(page,cookiesRaw){ for(const host of HOSTS){ try{ await page.goto(`https://${host}/`,{waitUntil:'domcontentloaded',timeout:60000}); const arr=cookiesRaw.map(c=>cookieForUrl(c,host)); await page.setCookie(...arr); }catch(e){ if(String(e?.message||'').includes('ERR_NAME_NOT_RESOLVED')) continue; else throw e; } } }

async function ensureLoggedIn(page){ try{ await page.goto('https://x.com/home',{waitUntil:'domcontentloaded',timeout:60000}); await page.waitForTimeout(400); const ck=await page.cookies('https://x.com'); const hasAuth=ck.some(c=>c.name==='auth_token'); const nav=await page.$('[data-testid="SideNav_AccountSwitcher_Button"], [data-testid="AppTabBar_Home_Link"]'); if(hasAuth||nav) return true; await page.goto('https://twitter.com/home',{waitUntil:'domcontentloaded',timeout:60000}); await page.waitForTimeout(400); const ck2=await page.cookies('https://twitter.com'); const hasAuth2=ck2.some(c=>c.name==='auth_token'); const nav2=await page.$('[data-testid="SideNav_AccountSwitcher_Button"], [data-testid="AppTabBar_Home_Link"]'); return !!(hasAuth2||nav2); }catch{return false;} }

async function openTweet(page,url){ const id=extractTweetId(url); for(const host of HOSTS){ const u=new URL(url,'https://'+host); u.protocol='https:'; u.host=host; try{ await page.goto(u.toString(),{waitUntil:'domcontentloaded',timeout:60000}); await page.waitForSelector('main[role="main"]',{timeout:8000}).catch(()=>{}); return {host,id}; }catch(e){ if(String(e?.message||'').includes('ERR_NAME_NOT_RESOLVED')) continue; else throw e; } } await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000}); return {host:'x.com',id}; }

async function revealSensitive(page){ try{ const btns=await page.$$('[role="button"],button'); for(const b of btns){ const t=(await b.evaluate(el=>el.textContent||''))?.toLowerCase(); if(/view|show|lihat|tampilkan/.test(t)) { try{ await b.click(); await page.waitForTimeout(300);}catch{} } } }catch{} }

async function getArticleById(page,id){ if(!id) return null; for(let i=0;i<3;i++){ try{ await page.waitForSelector('article',{timeout:6000}); const h=await page.evaluateHandle((id)=>{ const sel=`a[href$="/status/${id}"]`; const links=[...document.querySelectorAll(sel)]; for(const a of links){ const art=a.closest('article'); if(art) return art; } return null; },id); const el=h.asElement(); if(el) return el; await revealSensitive(page); await page.evaluate(()=>window.scrollBy(0, 900)); await sleep(400); }catch{} } return null; }

async function retry(fn,times){ let last={ok:false}; for(let i=0;i<times;i++){ last=await fn(i); if(last.ok||last.already) return last; await sleep(700+i*500);} return last; }

async function findComposer(page, timeout=12000){ const sels=[
  '[data-testid="tweetTextarea_0"] div[contenteditable="true"]',
  '[role="dialog"] [data-testid="tweetTextarea_0"] div[contenteditable="true"]',
  '[role="dialog"] [role="textbox"][contenteditable="true"]',
  '[role="textbox"][contenteditable="true"]',
  '[role="dialog"] div.DraftEditor-root [contenteditable="true"]',
  'div.DraftEditor-root [contenteditable="true"]',
  '[data-contents="true"][contenteditable="true"]'
];
  let el=null;
  for (const sel of sels){
    try { el = await page.waitForSelector(sel,{timeout:Math.max(2500, Math.floor(timeout/sels.length))}); if(el) return el; } catch {}
  }
  return null;
}

async function findSubmitBtn(page){ return (await page.evaluateHandle(()=>{ function vis(e){ const r=e.getBoundingClientRect(); const s=getComputedStyle(e); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&e.getAttribute('aria-disabled')!=='true'&&!e.disabled; } const sels=['[data-testid="tweetButtonInline"]','[data-testid="tweetButton"]','[data-testid="tweetButtonPost"]']; for(const sel of sels){ const cand=[...document.querySelectorAll(sel)].find(vis); if(cand) return cand; } return null; })).asElement(); }

async function domLike(page,url,cfg){ const {id}=await openTweet(page,url); return retry(async(n)=>{ const art=await getArticleById(page,id); if(!art) return {ok:false,reason:'tweet not rendered'}; const hasU=await art.$('[data-testid="unlike"]')||await page.$('[data-testid="unlike"]'); if(hasU) return {ok:true,already:true}; const btn=await art.$('[data-testid="like"]')||await page.$('[data-testid="like"]'); if(!btn){ if(n===0) await page.reload({waitUntil:'domcontentloaded'}); else await page.evaluate(()=>window.scrollBy(0,700)); return {ok:false,reason:'like button not found'}; } await btn.click(); await page.waitForTimeout(900); const now=await art.$('[data-testid="unlike"]')||await page.$('[data-testid="unlike"]'); return {ok:!!now}; }, cfg.maxRetries); }

async function domRetweet(page,url,cfg){ const {id}=await openTweet(page,url); return retry(async(n)=>{ const art=await getArticleById(page,id); if(!art) return {ok:false,reason:'tweet not rendered'}; const hasUn=await art.$('[data-testid="unretweet"]')||await page.$('[data-testid="unretweet"]'); if(hasUn) return {ok:true,already:true}; const btn=await art.$('[data-testid="retweet"]')||await page.$('[data-testid="retweet"]'); if(!btn){ if(n===0) await page.reload({waitUntil:'domcontentloaded'}); else await page.evaluate(()=>window.scrollBy(0,700)); return {ok:false,reason:'retweet button not found'}; } await btn.click(); try{ const confirm=await page.waitForSelector('[data-testid="retweetConfirm"], [data-testid="repostConfirm"], [role="menuitem"]',{timeout:6000}); const isMenu=await confirm.evaluate(el=>el.getAttribute('data-testid')===null); if(!isMenu) await confirm.click(); else { const items=await page.$$('[role="menuitem"]'); for(const it of items){ const t=(await it.evaluate(n=>n.textContent||''))?.toLowerCase(); if(t.includes('retweet')||t.includes('repost')){ await it.click(); break; } } } await page.waitForTimeout(900);}catch{} return {ok:true}; }, cfg.maxRetries); }

async function findFollowBtn(page){ const h=await page.evaluateHandle(()=>{ const c=[...document.querySelectorAll('[data-testid*="-follow"], [data-testid="placementTracking"], [role="button"]')]; function vis(e){ const r=e.getBoundingClientRect(); const s=window.getComputedStyle(e); return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'; } for(const el of c){ const t=(el.textContent||'').toLowerCase(); const id=(el.getAttribute('data-testid')||'').toLowerCase(); if((/follow/.test(t)||/-follow$/.test(id))&&vis(el)) return el; } return null; }); return h.asElement(); }

async function domFollow(page,url,cfg){ const pure=url.replace(/\/status\/\d+.*/, ''); await openTweet(page,pure); return retry(async(n)=>{ const already=await page.$('[data-testid*="-unfollow"]'); if(already) return {ok:true,already:true}; const btn=await findFollowBtn(page); if(!btn){ if(n===0) await page.reload({waitUntil:'domcontentloaded'}); else await page.evaluate(()=>window.scrollBy(0,700)); return {ok:false,reason:'follow button not found'}; } await btn.click(); await page.waitForTimeout(800); return {ok:true}; }, cfg.maxRetries); }

async function domUnfollow(page,url,cfg){ const pure=url.replace(/\/status\/\d+.*/, ''); await openTweet(page,pure); return retry(async(n)=>{ const btn=await page.$('[data-testid*="-unfollow"]'); if(!btn){ if(n===0) await page.reload({waitUntil:'domcontentloaded'}); else await page.evaluate(()=>window.scrollBy(0,700)); return {ok:false,reason:'unfollow button not found'}; } await btn.click(); try{ const confirm=await page.waitForSelector('[data-testid="confirmationSheetConfirm"], [role="button"]',{timeout:5000}); const txt=(await confirm.evaluate(el=>el.textContent||''))?.toLowerCase(); if(txt.includes('unfollow')) await confirm.click(); }catch{} await page.waitForTimeout(700); return {ok:true}; }, cfg.maxRetries); }

async function openGlobalComposer(page){ const sz=['[data-testid="SideNav_NewTweet_Button"]','[data-testid="AppTabBar_NewTweet_Button"]','a[href="/compose/tweet"]','a[href="/compose/post"]']; for(const sel of sz){ const btn=await page.$(sel); if(btn){ try{ await btn.click(); await page.waitForTimeout(600); return true; }catch{} } } return false; }

async function domTweet(page,text,cfg){ for(const host of HOSTS){ try{ await page.goto(`https://${host}/compose/tweet`,{waitUntil:'domcontentloaded',timeout:60000}); let area=await findComposer(page,12000); if(!area){ await page.goto(`https://${host}/compose/post`,{waitUntil:'domcontentloaded',timeout:60000}); area=await findComposer(page,12000); }
      if(!area){ await page.goto(`https://${host}/home`,{waitUntil:'domcontentloaded',timeout:60000}); await openGlobalComposer(page); area=await findComposer(page,12000); if(!area){ await page.keyboard.down('n'); await page.keyboard.up('n'); area=await findComposer(page,8000); } }
      if(!area) continue; await area.click({delay:50}); await page.keyboard.type(text,{delay:5}); const submit=await findSubmitBtn(page); if(!submit) return {ok:false,reason:'submit button not found'}; await submit.click(); await page.waitForTimeout(1200); return {ok:true}; }catch(e){ if(String(e?.message||'').includes('ERR_NAME_NOT_RESOLVED')) continue; }
  }
  return {ok:false,reason:'compose UI error'};
}

async function domReply(page,url,text,cfg){ const {id}=await openTweet(page,url); return retry(async(n)=>{ const art=await getArticleById(page,id); if(!art) return {ok:false,reason:'tweet not rendered'}; const rbtn=await art.$('[data-testid="reply"]')||await page.$('[data-testid="reply"]'); if(!rbtn){ if(n===0) await page.reload({waitUntil:'domcontentloaded'}); else await page.evaluate(()=>window.scrollBy(0,700)); return {ok:false,reason:'reply button not found'}; } await rbtn.click(); let area=null; try{ area=await findComposer(page,12000); }catch{} if(!area) return {ok:false,reason:'reply editor not found'}; await area.click({delay:50}); if(text) await page.keyboard.type(text,{delay:5}); const submit=await findSubmitBtn(page); if(!submit) return {ok:false,reason:'reply submit not found'}; await submit.click(); await page.waitForTimeout(1000); return {ok:true}; }, cfg.maxRetries); }

async function run(){
  banner();
  if(!fs.existsSync(CONFIG_FILE)){ log.err('[!] Missing konfiguration.json'); process.exit(1); }
  const cfg=normalizeCfg(readJSON(CONFIG_FILE));
  if(cfg.autoCreateTargetFiles){ for(const p of Object.values(TARGETS)) if(!fs.existsSync(p)) fs.writeFileSync(p,''); if(!fs.existsSync(COOKIE_DIR)) fs.mkdirSync(COOKIE_DIR,{recursive:true}); }
  const likeT=cfg.like?readLines(TARGETS.like):[];
  const retweetT=cfg.retweet?readLines(TARGETS.retweet):[];
  const followT=cfg.follow?readLines(TARGETS.follow):[];
  const unfollowT=cfg.unfollow?readLines(TARGETS.unfollow):[];
  const tweetT=cfg.tweet?readLines(TARGETS.tweet):[];
  const replyT=cfg.reply?readLines(TARGETS.reply).map(parseReplyLine):[];
  const cookieFiles=fs.existsSync(COOKIE_DIR)?(await fs.promises.readdir(COOKIE_DIR)).filter(f=>/^X\d+\.json$/i.test(f)).map(f=>path.join(COOKIE_DIR,f)).sort((a,b)=>Number(a.match(/(\d+)/)[1])-Number(b.match(/(\d+)/)[1])):[];
  log.info(`[>] accounts in ./X = ${cookieFiles.length}`);
  log.info(`[>] targets -> like=${likeT.length} retweet=${retweetT.length} follow=${followT.length} unfollow=${unfollowT.length} tweet=${tweetT.length} reply=${replyT.length}`);
  if(!cookieFiles.length){ log.err('[!] No cookie files in ./X'); return; }
  if(![likeT.length,retweetT.length,followT.length,unfollowT.length,tweetT.length,replyT.length].some(n=>n>0)){ log.warn('[i] no targets'); return; }
  const browser=await puppeteer.launch({ headless:'new', args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'] });
  try{
    for(const cookiePath of cookieFiles){
      const label=path.basename(cookiePath);
      log.head(`=== Account ${label} ===`);
      const cookiesRaw=JSON.parse(fs.readFileSync(cookiePath,'utf8').replace(/^\uFEFF/, '').trim());
      if(!Array.isArray(cookiesRaw)&&!(cookiesRaw&&Array.isArray(cookiesRaw.cookies))){ log.warn(`[skip] ${label} -> cookie file invalid`); continue; }
      const arr=Array.isArray(cookiesRaw)?cookiesRaw:cookiesRaw.cookies;
      const page=await browser.newPage();
      await page.setUserAgent(cfg.userAgent || (cfg.emulateMobile? 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'));
      if(cfg.emulateMobile) await page.setViewport({width:414,height:896,deviceScaleFactor:2,isMobile:true}); else await page.setViewport({width:1280,height:800,deviceScaleFactor:1});
      await setCookiesUrlBased(page,arr);
      const logged=await ensureLoggedIn(page);
      if(!logged){ log.err('[auth] not logged in — cookies invalid/expired'); await page.close(); continue; }
      let done=0,succ=0; const limit=+(cfg.perAccount||5);
      for(const u of shuf(likeT)){ if(done>=limit) break; const r=await domLike(page,u,cfg); r.ok?(log.ok(`[like] ${extractTweetId(u)||u} ${r.already?'(already)':''}`),succ++):log.err(`[like] fail ${extractTweetId(u)||u} - ${r.reason||'unknown'}`); done++; await sleep(within(cfg.delayMin,cfg.delayMax)); }
      for(const u of shuf(retweetT)){ if(done>=limit) break; const r=await domRetweet(page,u,cfg); r.ok?(log.ok(`[retweet] ${extractTweetId(u)||u} ${r.already?'(already)':''}`),succ++):log.err(`[retweet] fail ${extractTweetId(u)||u} - ${r.reason||'unknown'}`); done++; await sleep(within(cfg.delayMin,cfg.delayMax)); }
      for(const it of shuf(replyT)){ if(done>=limit) break; const r=await domReply(page,it.url,it.text,cfg); r.ok?(log.ok(`[reply] ${extractTweetId(it.url)||it.url}`),succ++):log.err(`[reply] fail ${extractTweetId(it.url)||it.url} - ${r.reason||'unknown'}`); done++; await sleep(within(cfg.delayMin,cfg.delayMax)); }
      for(const u of shuf(followT)){ if(done>=limit) break; const r=await domFollow(page,u,cfg); r.ok?(log.ok(`[follow] ${extractScreen(u)||u} ${r.already?'(already)':''}`),succ++):log.err(`[follow] fail ${extractScreen(u)||u} - ${r.reason||'unknown'}`); done++; await sleep(within(cfg.delayMin,cfg.delayMax)); }
      for(const u of shuf(unfollowT)){ if(done>=limit) break; const r=await domUnfollow(page,u,cfg); r.ok?(log.ok(`[unfollow] ${extractScreen(u)||u}`),succ++):log.err(`[unfollow] fail ${extractScreen(u)||u} - ${r.reason||'unknown'}`); done++; await sleep(within(cfg.delayMin,cfg.delayMax)); }
      for(const t of shuf(tweetT)){ if(done>=limit) break; const r=await domTweet(page,t,cfg); r.ok?(log.ok(`[tweet] ${t.slice(0,60)}${t.length>60?'…':''}`),succ++):log.err(`[tweet] fail - ${r.reason||'unknown'}`); done++; await sleep(within(cfg.delayMin,cfg.delayMax)); }
      await page.close();
      log.info(`[=] ${label} selesai — actions:${done} success:${succ}`);
      await sleep((cfg.cooldownBetweenAccounts||10)*1000);
    }
  } finally { await browser.close(); }
}

run().catch(e=>{ console.error(chalk.red('FATAL:'), e); process.exit(1); });
