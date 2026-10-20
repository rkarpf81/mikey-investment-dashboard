import json,datetime,pathlib,time
import yfinance as yf
symbols="FXAIX AVGO BABA CLG CLSK CRWV EBAY FSELX FSKAX GCT GME MARA META MRVL MSFT MU NBIS NVDA ONDS PLNT RBRK RIG RIOT SOUN SPIR TTWO VIST VRT WULF YEXT".split()
path=pathlib.Path("quotes.json")
try: old=json.loads(path.read_text())
except Exception: old={"quotes":{}}
quotes=old.get("quotes",{})
success=0
for symbol in symbols:
 try:
  t=yf.Ticker(symbol)
  history=t.history(period="5d",auto_adjust=False)
  if history.empty: continue
  price=float(history["Close"].iloc[-1])
  prev=float(history["Close"].iloc[-2]) if len(history)>1 else None
  stamp=history.index[-1].isoformat()
  if price<=0: continue
  quotes[symbol]={"price":price,"previousClose":prev,"asOf":stamp,"source":"Yahoo Finance via yfinance"}
  success+=1
 except Exception as exc: print(symbol,str(exc)[:160])
if not success: raise SystemExit("No quotes returned: refusing to overwrite snapshot")
path.write_text(json.dumps({"updatedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"quotes":quotes,"successCount":success,"total":len(symbols)},indent=2)+"\n")
print("Updated",success,"of",len(symbols))
