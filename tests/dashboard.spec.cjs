const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/';
let documentBuild;
test.beforeEach(async({page})=>{await page.goto(url);documentBuild=await page.locator('meta[name="dashboard-build"]').getAttribute('content');});
test('desktop cards, holdings, and saved user data survive reload',async({page})=>{
 await page.goto(url);
 await page.evaluate(()=>{
  localStorage.setItem('mikey-dashboard-v1',JSON.stringify({
   holdings:[{ticker:'FXAIX',shares:12.5,cost:250,price:300,value:3750,target:0,priority:'Now'},
   {ticker:'NVDA',shares:2.25,cost:100,price:150,value:337.5,target:0,priority:'Later'}],
   watch:[{name:'Example',note:'Retain this',decision:'Research'}]
  }));
 });
 await page.reload();
 await expect(page.locator('#holdings tr')).toHaveCount(2);
 await expect(page.locator('#watch tr')).toHaveCount(1);
 await expect(page.locator('#total')).toContainText('$4,087.50');
 await expect(page.locator('#refreshBtn')).toBeVisible();
 await expect(page.locator('#refreshBtn')).toHaveCount(1);
 const grid=await page.locator('.cards').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
 expect(grid).toBe(5);
 const cards=page.locator('.cards > .card');
 await expect(cards).toHaveCount(5);
 const styles=await cards.evaluateAll(nodes=>nodes.map(node=>{
  const cs=getComputedStyle(node),r=node.getBoundingClientRect();
  return {width:cs.borderTopWidth,color:cs.borderTopColor,style:cs.borderTopStyle,x:r.x,y:r.y,height:r.height};
 }));
 for(const card of styles){
  expect(card.width).toBe('2px');
  expect(card.color).toBe('rgb(113, 137, 168)');
  expect(card.style).toBe('solid');
 }
 expect(Math.max(...styles.map(c=>c.y))-Math.min(...styles.map(c=>c.y))).toBeLessThan(2);
 expect(styles.every(c=>c.height>100)).toBe(true);

 await page.reload();
 await expect(page.locator('#holdings tr')).toHaveCount(2);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('mikey-dashboard-v1')));
 expect(stored.holdings[0].shares).toBe(12.5);
 expect(stored.holdings[0].cost).toBe(250);
 expect(stored.watch[0].note).toBe('Retain this');
});

test('refresh applies published quotes without changing shares or cost',async({page})=>{
 await page.route('**/?dashboard_check=*',route=>route.fulfill({status:200,contentType:'text/html',body:'<meta name="dashboard-build" content="'+documentBuild+'">'}));
 await page.route('**/quotes.json?*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({updatedAt:new Date().toISOString(),quotes:{FXAIX:{price:320,previousClose:315,asOf:new Date().toISOString()}}})}));
 await page.goto(url);
 await page.evaluate(()=>localStorage.setItem('mikey-dashboard-v1',JSON.stringify({
  holdings:[{ticker:'FXAIX',shares:2.5,cost:250,price:300,value:750,target:0,priority:'Now'}],
  watch:[{name:'Example',note:'Preserved',decision:'Research'}]
 })));
 await page.reload();
 await page.locator('#refreshBtn').click();
 await expect(page.locator('#total')).toContainText('$800.00');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('mikey-dashboard-v1')));
 expect(stored.holdings[0].shares).toBe(2.5);
 expect(stored.holdings[0].cost).toBe(250);
 expect(stored.holdings[0].priority).toBe('Now');
 expect(stored.watch[0].note).toBe('Preserved');
});

test('quote failure preserves all browser records',async({page})=>{
 await page.route('**/?dashboard_check=*',route=>route.fulfill({status:200,contentType:'text/html',body:'<meta name="dashboard-build" content="'+documentBuild+'">'}));
 await page.route('**/quotes.json?*',route=>route.fulfill({status:503,body:'unavailable'}));
 const original={holdings:[{ticker:'FXAIX',shares:3,cost:200,price:250,value:750,priority:'Now'}],watch:[]};
 await page.goto(url);
 await page.evaluate(v=>localStorage.setItem('mikey-dashboard-v1',JSON.stringify(v)),original);
 await page.reload();
 await page.locator('#refreshBtn').click();
 await expect(page.locator('#refreshStatus')).toContainText('Market prices unavailable');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('mikey-dashboard-v1')));
 expect(stored).toEqual(original);
});
test('no duplicate refresh requests on repeated clicks',async({page})=>{
 let calls=0;
 await page.route('**/?dashboard_check=*',route=>route.fulfill({status:200,contentType:'text/html',body:'<meta name="dashboard-build" content="'+documentBuild+'">'}));
 await page.route('**/quotes.json?*',async route=>{calls++;await new Promise(r=>setTimeout(r,150));await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({updatedAt:new Date().toISOString(),quotes:{}})});});
 await page.goto(url);
 await page.locator('#refreshBtn').evaluate(el=>{el.click();el.click()});
 await expect.poll(()=>calls,{timeout:10000}).toBe(1);
 await expect(page.locator('#refreshBtn')).toBeEnabled();
});

test('goal banner is compact and obsolete subtitle is removed',async({page})=>{
 await page.setViewportSize({width:1360,height:900});
 await page.goto(url);
 const banner=page.locator('.summary');
 await expect(banner).toContainText('Building toward $185,000');
 await expect(banner).not.toContainText('Based on manually entered holdings');
 await expect(banner).not.toContainText('Long-term goal by age 18');
 // Height ratio and screenshot checks are enforced in release-visual.spec.cjs.
 await expect(page.locator('#goaltext')).toBeVisible();
 await expect(page.locator('#goalbar')).toBeVisible();
});

test('refresh detects changed published HTML and reloads with cache-busting URL',async({page})=>{
 await page.route('**/?dashboard_check=*',route=>route.fulfill({status:200,contentType:'text/html',body:'<meta name="dashboard-build" content="new-layout-2026">'}));
 await page.goto(url);
 await page.evaluate(()=>localStorage.setItem('mikey-dashboard-v1',JSON.stringify({holdings:[{ticker:'FXAIX',shares:2,cost:100,price:200,value:400,priority:'Now'}],watch:[]})));
 await page.reload();
 await page.locator('#refreshBtn').click();
 await expect(page).toHaveURL(/dashboard_build=new-layout-2026/);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('mikey-dashboard-v1')).holdings[0].shares)).toBe(2);
});

test('holdings columns never overlap and shares/cost are plain text',async({page})=>{
 await page.setViewportSize({width:1290,height:900});
 await page.goto(url);
 await expect(page.locator('#holdingsTable tbody tr')).toHaveCount(30);
 await expect(page.locator('#holdingsTable tbody input')).toHaveCount(0);
 await expect(page.locator('#holdingsTable tbody tr').first().locator('td').first()).toContainText('Fidelity 500 Index Fund');
 const measurements=await page.locator('#holdingsTable tbody tr').first().locator('td').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width}}));
 expect(measurements).toHaveLength(11);
 for(let i=1;i<measurements.length;i++)expect(measurements[i].left).toBeGreaterThanOrEqual(measurements[i-1].right-1);
 const first=await page.locator('#holdingsTable tbody tr').first().locator('td').first().evaluate(n=>{const name=n.querySelector('.stock-name').getBoundingClientRect(),ticker=n.querySelector('b').getBoundingClientRect();return {below:name.top>=ticker.bottom-1,right:name.right<=n.getBoundingClientRect().right+1}});
 expect(first.below).toBe(true);
 expect(first.right).toBe(true);
});
