#!/usr/bin/env python3
"""
Quick local probe for OpenWeather One Call v3.0

Usage examples (run from repo root or controller/):
  python controller/tests/weather_probe.py --lat 32.0853 --lon 34.7818 --hours 12

Requirements:
  - Environment variable OPEN_WEATHER_API_KEY must be set, or provide a controller/.env with it.

This prints:
  - Daily summary (today): rain (mm), pop, weather, sunrise/sunset
  - Hourly rows for the next N hours: time, pop, rain_1h (mm), temp, humidity, wind, clouds, uvi
"""

from __future__ import annotations

import argparse
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import requests


def load_env_if_present() -> None:
    """Load controller/.env if present (no hard dependency on python-dotenv)."""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        try:
            # Lazy import to avoid extra dependency unless available
            from dotenv import load_dotenv  # type: ignore

            load_dotenv(dotenv_path=env_path)
        except Exception:
            # Silently ignore if python-dotenv isn't installed
            pass


def ts_to_local(ts: int) -> str:
    try:
        return datetime.fromtimestamp(ts, tz=timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")
    except Exception:
        return str(ts)


def get_weather(lat: float, lon: float, api_key: str, timeout: float = 5.0) -> Dict[str, Any]:
    url = "https://api.openweathermap.org/data/3.0/onecall"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        # Keep hourly and daily; alerts optional
        "exclude": "minutely",
        "units": "metric",
    }
    resp = requests.get(url, params=params, timeout=timeout)
    resp.raise_for_status()
    return resp.json()


def main() -> None:
    load_env_if_present()

    parser = argparse.ArgumentParser(description="Probe OpenWeather hourly/daily data")
    parser.add_argument("--lat", type=float, required=True, help="Latitude")
    parser.add_argument("--lon", type=float, required=True, help="Longitude")
    parser.add_argument("--hours", type=int, default=12, help="How many hourly rows to print (default 12)")
    args = parser.parse_args()

    api_key = os.getenv("OPEN_WEATHER_API_KEY")
    if not api_key:
        print("ERROR: OPEN_WEATHER_API_KEY is not set. Put it in controller/.env or your shell env.")
        return

    try:
        data = get_weather(args.lat, args.lon, api_key)
    except Exception as e:
        print(f"ERROR: failed to fetch weather: {e}")
        return

    # Daily summary (today)
    daily = (data.get("daily") or [{}])[0]
    d_weather = ((daily.get("weather") or [{}])[0]).get("main", "?")
    d_pop = daily.get("pop")  # 0..1 probability of precip
    d_rain = daily.get("rain")  # mm
    d_sunrise = ts_to_local(daily.get("sunrise", 0)) if daily.get("sunrise") else "-"
    d_sunset = ts_to_local(daily.get("sunset", 0)) if daily.get("sunset") else "-"

    print("\n=== Daily (today) ===")
    print(f"weather={d_weather}  rain_mm={d_rain}  pop={d_pop}  sunrise={d_sunrise}  sunset={d_sunset}")

    # Hourly rows
    hourly = data.get("hourly") or []
    n = max(0, min(args.hours, len(hourly)))
    print(f"\n=== Hourly (next {n} rows) ===")
    header = "time_local          pop   rain_1h_mm  tempC  humid%  wind_mps  clouds%  uvi"
    print(header)
    print("-" * len(header))
    for i in range(n):
        h = hourly[i] or {}
        t = ts_to_local(h.get("dt", 0))
        pop = h.get("pop")
        rain_1h = None
        try:
            rain_1h = (h.get("rain") or {}).get("1h")
        except Exception:
            rain_1h = None
        temp = h.get("temp")
        hum = h.get("humidity")
        wind = h.get("wind_speed")
        clouds = h.get("clouds")
        uvi = h.get("uvi")
        print(
            f"{t:19s}  {str(pop or 0):>3}   {str(rain_1h or 0):>9}  {str(temp or '-') :>5}  {str(hum or '-') :>6}  {str(wind or '-') :>8}  {str(clouds or '-') :>7}  {str(uvi or '-') }"
        )

    # Hints for decision logic (preview only)
    any_heavy_hour = any(
        ((h or {}).get("pop", 0) or 0) >= 0.6 and (((h or {}).get("rain") or {}).get("1h", 0) or 0) >= 1.0
        for h in hourly[:n]
    )
    any_light_hour = any(
        ((h or {}).get("pop", 0) or 0) >= 0.4 and 0.2 <= (((h or {}).get("rain") or {}).get("1h", 0) or 0) < 1.0
        for h in hourly[:n]
    )
    print("\nDecision preview (example thresholds):")
    print(f"  heavy_rain_soon → skip: {any_heavy_hour}")
    print(f"  light_rain_soon → reduce: {any_light_hour}")


if __name__ == "__main__":
    main()


