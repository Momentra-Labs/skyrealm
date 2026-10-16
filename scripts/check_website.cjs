const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
(async()=>{
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5177','--strictPort'],{windowsHide:true});let browser;
 try {
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))resolve()});server.on('error',reject);server.on('exit',c=>reject(Error('Vite '+c)))});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5177/');await page.waitForFunction(()=>[...document.querySelectorAll('.lp-hero-ensemble img')].every(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:'docs/art/website-fantasy-desktop.png'});
 await page.getByRole('button',{name:/^Preview Kairo$/i}).click();assert.equal(await page.getByRole('button',{name:/^Preview Kairo$/i}).getAttribute('aria-pressed'),'true');assert.match(await page.locator('.lp-guardian-detail').innerText(),/Kairo/i);
 await page.getByText('Will my progress be saved?',{exact:true}).click();assert.ok(await page.locator('.lp-faq details[open]').count());
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+width)}
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));
 await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('navigation',{name:'Mobile navigation'}).waitFor();
 await page.keyboard.press('Escape');assert.equal(await page.locator('#lp-drawer').count(),0);assert.equal(await page.getByRole('button',{name:'Open navigation'}).evaluate(el=>el===document.activeElement),true);
 await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'HOW TO PLAY'}).click();assert.equal(await page.locator('#lp-drawer').count(),0);
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'docs/art/website-fantasy-mobile.png'});
 await page.locator('.lp-mobile-launch button').click();await page.getByRole('button',{name:'TAKE FLIGHT',exact:true}).waitFor({timeout:60000});assert.equal(new URL(page.url()).hash,'#play');assert.deepEqual(errors,[]);
 console.log('Website checks passed: responsive widths, guardian preview, FAQ, mobile navigation, Escape focus, game launch.');
 }finally{await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});

