from dotenv import load_dotenv
import os # Provides access to environment variables
import requests  # For making HTTP requests to the weather API
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

class WeatherService:
    """
    Service for retrieving weather forecast data using OpenWeather's One Call API.

    This class is used to determine if rain is expected today at a given location
    (based on latitude and longitude coordinates).
    """

    def __init__(self):
        """
        Initializes the weather service by loading the API key from environment variables.
        
        Raises:
            ValueError: If the API key is not found in the environment.
        """
        self.api_key = os.getenv("OPEN_WEATHER_API_KEY")  # Load the API key from the environment variables
        self.api_url = "https://api.openweathermap.org/data/3.0/onecall" # The URL of the OpenWeather One Call API
        if not self.api_key:
            raise ValueError("API key for OpenWeather is not set. Please set the OPEN_WEATHER_API_KEY environment variable.")
        
    def will_rain_today(self, lat, lon, timeout_seconds: float = 3.0):
        """
        Checks if rain is expected today at the given location.

        Args:
            lat (float): Latitude of the plant's location.
            lon (float): Longitude of the plant's location.

        Returns:
            bool: True if rain is expected, False otherwise.
        """
        params = {
            "lat": lat,                           # Latitude of the location
            "lon": lon,                           # Longitude of the location
            "appid": self.api_key,                # API key for authentication
            "exclude": "minutely,hourly,alerts",  # Exclude unnecessary data to reduce response size - Only daily forecast is needed
            "units": "metric"                     # Use metric units for temperature
        }

        try:
            # Use a short timeout to avoid blocking the event loop for long periods
            response = requests.get(self.api_url, params=params, timeout=timeout_seconds)             # Make the API request
            response.raise_for_status()                                      # Raise an error for bad responses 
            data = response.json()
    
            today_weather = data['daily'][0]                                 # Get today's weather data from the response
            weather_main = today_weather['weather'][0]['main'].lower()       # Get the main weather condition for today (Rain, Clear, etc.)
            rain_amount = today_weather.get('rain', 0)                       # Get the amount of rain expected today, default to 0 if not present
            if 'rain' in weather_main or rain_amount > 0:                    # Check if rain is expected today
                print(f"Rain expected today: {weather_main}, Amount: {rain_amount} mm")                   
                return True
        except Exception as e:
            print(f"Error checking rain forecast: {e}")

        return False
        
    def precipitation_mm_next_hours(self, lat: float, lon: float, hours: int = 12, timeout_seconds: float = 3.0) -> float | None:
        """
        Returns the total forecast precipitation (rain + snow) in millimeters for the next N hours.

        Args:
            lat (float): Latitude
            lon (float): Longitude
            hours (int): Lookahead window in hours (e.g., 6 or 12)
            timeout_seconds (float): Request timeout

        Returns:
            float: Total precipitation in mm over the next N hours.
        """
        if hours <= 0:
            return 0.0

        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.api_key,
            # Include hourly data for precise short-term precipitation forecast
            "exclude": "minutely,alerts,daily,current",
            "units": "metric",
        }

        try:
            response = requests.get(self.api_url, params=params, timeout=timeout_seconds)
            response.raise_for_status()
            data = response.json()

            hourly = data.get("hourly", [])
            if not hourly:
                # Signal missing hourly so callers can decide on fallback path
                return None
            window = hourly[:max(0, int(hours))]
            total_mm = 0.0
            for h in window:
                rain_val = h.get("rain", 0)  # May be dict {"1h": mm} or number
                snow_val = h.get("snow", 0)  # Same shape as rain

                def _to_mm(v):
                    if isinstance(v, dict):
                        return float(v.get("1h", 0.0) or 0.0)
                    try:
                        return float(v or 0.0)
                    except Exception:
                        return 0.0

                total_mm += _to_mm(rain_val) + _to_mm(snow_val)

            return float(total_mm)
        except Exception as e:
            print(f"Error fetching hourly precipitation: {e}")
            return None

    def daily_precipitation_mm_today(self, lat: float, lon: float, timeout_seconds: float = 3.0) -> float:
        """
        Returns the total forecast precipitation (rain + snow) for today (24h aggregate).

        Uses the daily portion of the One Call API.
        """
        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.api_key,
            "exclude": "minutely,hourly,alerts",
            "units": "metric",
        }
        try:
            response = requests.get(self.api_url, params=params, timeout=timeout_seconds)
            response.raise_for_status()
            data = response.json()
            today = (data or {}).get("daily", [{}])[0]

            def _to_mm(v):
                if isinstance(v, dict):
                    return float(v.get("1d", 0.0) or v.get("24h", 0.0) or 0.0)
                try:
                    return float(v or 0.0)
                except Exception:
                    return 0.0

            rain_mm = _to_mm(today.get("rain", 0.0))
            snow_mm = _to_mm(today.get("snow", 0.0))
            return float(rain_mm + snow_mm)
        except Exception as e:
            print(f"Error fetching daily precipitation: {e}")
            return 0.0
        
