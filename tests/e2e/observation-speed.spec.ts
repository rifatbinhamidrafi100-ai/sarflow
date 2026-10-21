import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Fixtures test request size and reuse, not scientific image content.
const archive = JSON.parse(readFileSync('public/data/observatory.json', 'utf8'));
const fixture = readFileSync('public/observations/nepal-rasuwa-thumbnail.png');

test('comparison downloads each preview once and reuses dates across mode changes', async ({ page }) => {
  const region = structuredClone(archive.regions[0]);
  region.observations = [region.observations[0], region.observations.at(-1)].map(frame => {
    const image = new URL(frame.request);
    image.searchParams.set('WIDTH', '1536'); image.searchParams.set('HEIGHT', '1536');
    return { ...frame, display: undefined, image: image.toString(), sha256: null, bytes: null };
  });
  const requests: string[] = [];
  await page.route(/^https:\/\/(?:services\.arcgisonline\.com|tiles\.maps\.eox\.at)\//,
    route => route.fulfill({ contentType: 'image/png', body: fixture }));
  await page.route('**/api/global-radar?*', route => route.fulfill({ json: { ...archive, regions: [region] } }));
  await page.route('**/gibs.earthdata.nasa.gov/**', async route => {
    const url = route.request().url();
    if (new URL(url).searchParams.get('WIDTH') !== '160') requests.push(url);
    await new Promise(resolve => setTimeout(resolve, 150));
    await route.fulfill({ contentType: 'image/png', body: fixture });
  });
  await page.goto('/world');
  await page.getByRole('button', { name: 'Discover observations here' }).click();
  const workspace = page.locator('#world-observation-comparison');
  const loaded = workspace.getByText('NASA imagery loaded', { exact: true });
  await expect(loaded).toBeVisible();
  expect(requests).toHaveLength(2);
  await workspace.getByRole('button', { name: 'Compare previous observation', exact: true }).click();
  await expect(loaded).toBeVisible();
  expect(requests).toHaveLength(4);
  expect(requests.map(request => new URL(request).searchParams.get('WIDTH')).sort()).toEqual(['1536','1536','384','384']);
  await workspace.getByRole('button', { name: 'Observe', exact: true }).click();
  await expect(loaded).toBeVisible();
  await workspace.getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(loaded).toBeVisible();
  await workspace.getByLabel('Selected observation date', { exact: true }).selectOption('0');
  await expect(loaded).toBeVisible();
  await workspace.getByLabel('Selected observation date', { exact: true }).selectOption('1');
  await expect(loaded).toBeVisible();
  expect(requests).toHaveLength(4);
});

test('shows a preview while detail is delayed and allows a quick-mode escape', async ({ page }) => {
  const region = structuredClone(archive.regions[0]);
  region.observations = [region.observations[0], region.observations.at(-1)].map(frame => {
    const image = new URL(frame.request); image.searchParams.set('WIDTH','1536'); image.searchParams.set('HEIGHT','1536');
    return {...frame, display:undefined, image:image.toString(),sha256:null,bytes:null};
  });
  let release!: () => void;
  const detail = new Promise<void>(resolve => { release = resolve; });
  await page.route(/^https:\/\/(?:services\.arcgisonline\.com|tiles\.maps\.eox\.at)\//,r=>r.fulfill({contentType:'image/png',body:fixture}));
  await page.route('**/api/global-radar?*',r=>r.fulfill({json:{...archive,regions:[region]}}));
  await page.route('**/gibs.earthdata.nasa.gov/**',async route=>{
    if(new URL(route.request().url()).searchParams.get('WIDTH')==='1536')await detail;
    await route.fulfill({contentType:'image/png',body:fixture});
  });
  try {
    await page.goto('/world');
    await page.getByRole('button',{name:'Discover observations here'}).click();
    const workspace=page.locator('#world-observation-comparison');
    await expect(workspace.getByText('Preview visible · loading full detail…',{exact:true})).toBeVisible();
    await expect(workspace.getByText('NASA imagery loaded',{exact:true})).toHaveCount(0);
    await expect(workspace.getByRole('link',{name:'Satellite photo',exact:true})).toHaveAttribute('href',`/world?lat=${region.center[1]}&lon=${region.center[0]}&zoom=16`);
    await workspace.getByLabel('Radar image detail').selectOption('384');
    await expect(workspace.getByText('NASA preview imagery loaded',{exact:true})).toBeVisible();
    release();
    await workspace.getByLabel('Radar image detail').selectOption('1536');
    await expect(workspace.getByText('NASA imagery loaded',{exact:true})).toBeVisible();
  } finally {release();}
});

test('a late comparison preview cannot replace the detailed image', async ({ page }) => {
  const region=structuredClone(archive.regions[0]);
  region.observations=[region.observations[0],region.observations.at(-1)].map(frame=>{
    const url=new URL(frame.request);url.searchParams.set('WIDTH','1536');url.searchParams.set('HEIGHT','1536');
    return {...frame,image:url.toString(),display:undefined,sha256:null,bytes:null};
  });
  const transparent=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==','base64');
  const red=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGM8wcDwnwEPYMInOXwUAADZywHXWQOH6AAAAABJRU5ErkJggg==','base64');
  const green=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGNkOMHwnwEPYMInOXwUAADZAwHXifIr0AAAAABJRU5ErkJggg==','base64');
  let release!:()=>void;const delayed=new Promise<void>(resolve=>{release=resolve;});
  await page.route(/^https:\/\/(?:services\.arcgisonline\.com|tiles\.maps\.eox\.at)\//,r=>r.fulfill({contentType:'image/png',body:fixture}));
  await page.route('**/api/global-radar?*',r=>r.fulfill({json:{...archive,regions:[region]}}));
  await page.route('**/gibs.earthdata.nasa.gov/**',async route=>{
    const url=new URL(route.request().url());const small=url.searchParams.get('WIDTH')==='384';
    if(small&&url.searchParams.get('TIME')===region.observations[1].date)await delayed;
    await route.fulfill({contentType:'image/png',body:small?(url.searchParams.get('TIME')===region.observations[0].date?transparent:red):green});
  });
  try {
    await page.goto('/world');await page.getByRole('button',{name:'Discover observations here'}).click();
    const w=page.locator('#world-observation-comparison');
    await w.getByRole('button',{name:'Compare',exact:true}).click();
    await expect(w.getByText('NASA imagery loaded',{exact:true})).toBeVisible();
    release();await page.waitForTimeout(300);
    const screenshot=await w.locator('.observation-map').screenshot();
    const rgb=await page.evaluate(async base64=>{
      const img=new Image();img.src=`data:image/png;base64,${base64}`;await img.decode();
      const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
      const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);
      return Array.from(ctx.getImageData(Math.floor(img.width/2)+35,Math.floor(img.height/2),1,1).data);
    },screenshot.toString('base64'));
    expect(rgb[1]).toBeGreaterThan(rgb[0]+80);
  } finally {release();}
});
