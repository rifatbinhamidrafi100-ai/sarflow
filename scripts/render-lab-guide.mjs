// Reproducible silent educational video. No observation imagery or scientific results.
import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const slides = JSON.parse(await readFile(path.join(root, 'src/data/lab-walkthrough.json'), 'utf8'));
const output = path.join(root, 'public/videos');
await mkdir(output, {recursive:true});
const browser = await chromium.launch({channel:'chrome'});
const context = await browser.newContext({viewport:{width:960,height:540}, recordVideo:{dir:path.join(root,'artifacts/guide-recording'),size:{width:960,height:540}}});
try {
  const page = await context.newPage();
  await page.setContent(`<html lang="en"><head><meta charset="UTF-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#112c46;color:#fff;font-family:Arial,sans-serif}main{padding:44px 54px;height:540px;display:flex;flex-direction:column}.brand{font-size:24px;font-weight:bold;color:#9fdfef}.label{margin-top:40px;font-size:18px;color:#9fdfef}h1{font-size:40px;line-height:1.15;margin:18px 0}p{font-size:25px;line-height:1.5;margin:0;max-width:850px}footer{margin-top:auto;display:flex;justify-content:space-between;font-size:15px;color:#c5d9e4}</style></head><body><main><div class="brand">SARFlow · Understand the Analysis lab</div><div class="label" id="label"></div><h1 id="title"></h1><p id="text"></p><footer><span>Educational explanation · not a real event result · silent video</span><span id="position"></span></footer></main></body></html>`);
  for(let index=0; index<slides.length;index++) {
    await page.evaluate(({slide,index,total})=>{
      document.querySelector('#label').textContent=slide.label;
      document.querySelector('#title').textContent=slide.title;
      document.querySelector('#text').textContent=slide.text;
      document.querySelector('#position').textContent=`${index+1} / ${total}`;
    },{slide:slides[index],index,total:slides.length});
    await page.waitForTimeout(8000);
  }
  const video = page.video();
  await page.close();
  await video.saveAs(path.join(output,'analysis-lab-guide.webm'));
  const stamp = seconds => `00:${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}.000`;
  await writeFile(path.join(output,'analysis-lab-guide.vtt'),'WEBVTT\n\n'+slides.map((s,i)=>`${stamp(i*8)} --> ${stamp((i+1)*8)}\n${s.title}\n${s.text}\n`).join('\n'));
  console.log('Rendered six 8-second educational slides and English captions.');
} finally { await context.close(); await browser.close(); }
