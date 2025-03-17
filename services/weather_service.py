# services/weather_service.py
import requests

class WeatherService:
    def __init__(self, api_key: str, units: str = "metric"):
        self.api_key = api_key
        self.units = units
        self.base_url = "http://api.openweathermap.org/data/2.5/weather"

    def get_weather(self, city: str):
        """
        Fetches weather data for the specified city.

        :param city: Name of the city (e.g., 'Tel Aviv')
        :return: Dictionary containing weather information
        """
        params = {
            "q": city,
            "appid": self.api_key,
            "units": self.units
        }

        try:
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()

            weather_info = {
                "city": city,
                "temperature": data["main"]["temp"],
                "humidity": data["main"]["humidity"],
                "weather_description": data["weather"][0]["description"],
                "rain": data.get("rain", {}).get("1h", 0)
            }
            return weather_info

        except requests.RequestException as e:
            print(f"Error fetching weather data for {city}: {e}")
            return None
