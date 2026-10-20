const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/';
test('desktop cards, holdings, and saved user data survive reload',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('mikey-dashboard-v1',JSON.stringify({
   holdings:[{ticker:'FXAIX',shares:12.5,cost:250,price:300,value:3750,target:0,priority:'Now'},
   {ticker:'NVDA',shares:2.25,cost:100,price:150,value:337.5,target:0,priority:'Later'}],
   watch:[{name:'Example',note:'Retain this',decision:'Research'}]
  }));
 });
 await page.goto(url);
 await expect(page.locator('#holdings tr')).toHaveCount(2);
 await expect(page.locator('#watch tr')).toHaveCount(1);
 await expect(page.locator('#total')).toContainText('$4,087.50');
 await expect(page.locator('#refreshBtn')).toBeVisible();
 await expect(page.locator('#refreshBtn')).toHaveCount(1);
 const grid=await page.locator('.cards').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
 expect(grid).toBe(5);
 await page.reload();
 await expect(page.locator('#holdings tr')).toHaveCount(2);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('mikey-dashboard-v1')));
 expect(stored.holdings[0].shares).toBe(12.5);
 expect(stored.holdings[0].cost).toBe(250);
 expect(stored.watch[0].note).toBe('Retain this');
});
