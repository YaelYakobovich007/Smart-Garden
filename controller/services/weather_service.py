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
        
    def will_rain_today(self, lat, lon):
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
            response = requests.get(self.api_url, params=params)             # Make the API request
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
        
