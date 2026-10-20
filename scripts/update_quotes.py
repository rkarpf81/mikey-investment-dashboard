"""Build a best-effort public quote snapshot from Yahoo Finance via yfinance.

Intraday 15-minute bars are preferred. Daily closes are the fallback for
mutual funds and unavailable intraday data. This is not a Fidelity feed.
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import yfinance as yf

SYMBOLS = "FXAIX AVGO BABA CLG CLSK CRWV EBAY FSELX FSKAX GCT GME MARA META MRVL MSFT MU NBIS NVDA ONDS PLNT RBRK RIG RIOT SOUN SPIR TTWO VIST VRT WULF YEXT".split()
OUTPUT = Path("quotes.json")


def last_positive(series):
    values = series.dropna() if series is not None else []
    if len(values) == 0:
        return None
    value = float(values.iloc[-1])
    return value if value > 0 else None


def fetch(symbol: str):
    ticker = yf.Ticker(symbol)
    intraday = ticker.history(period="5d", interval="15m", auto_adjust=False, prepost=False)
    daily = ticker.history(period="5d", interval="1d", auto_adjust=False)
    if intraday is not None and not intraday.empty:
        closes = intraday["Close"].dropna()
        price = last_positive(closes)
        if price is not None:
            previous = last_positive(daily["Close"].iloc[:-1]) if daily is not None and not daily.empty else None
            return {
                "price": price,
                "previousClose": previous,
                "asOf": intraday.index[-1].isoformat(),
                "source": "Yahoo Finance via yfinance · 15-minute bars",
            }
    if daily is not None and not daily.empty:
        closes = daily["Close"].dropna()
        price = last_positive(closes)
        if price is not None:
            previous = float(closes.iloc[-2]) if len(closes) > 1 else None
            return {
                "price": price,
                "previousClose": previous,
                "asOf": daily.index[-1].isoformat(),
                "source": "Yahoo Finance via yfinance · daily close fallback",
            }
    return None


def main():
    try:
        old = json.loads(OUTPUT.read_text())
        quotes = old.get("quotes", {})
    except (OSError, json.JSONDecodeError):
        quotes = {}
    errors = []
    successes = 0
    for symbol in SYMBOLS:
        try:
            quote = fetch(symbol)
            if quote is None:
                errors.append(f"{symbol}: no price returned")
                continue
            quotes[symbol] = quote
            successes += 1
        except Exception as exc:
            errors.append(f"{symbol}: {str(exc)[:160]}")
    if not successes and not quotes:
        raise SystemExit("No quotes returned and no prior snapshot exists; refusing to publish an empty snapshot")
    payload = {
        "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "quotes": quotes,
        "successCount": successes,
        "total": len(SYMBOLS),
        "provider": "Yahoo Finance via yfinance; may be delayed and rate limited",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Updated {successes} of {len(SYMBOLS)} symbols; retained prior values for failures")
    for error in errors:
        print(error)
    if not successes:
        raise SystemExit("No symbols refreshed; previous quote records were retained")


if __name__ == "__main__":
    main()
