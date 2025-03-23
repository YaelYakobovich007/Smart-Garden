# services/weather_service.py
import datetime
import requests

class WeatherService:
    def __init__(self):
        self.api_key = "לשאול את אליזבט"
        self.api_url = "https://api.openweathermap.org/data/3.0/onecall"

    def will_rain_today(self, lat, lon):
        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.api_key,
            "exclude": "minutely,hourly,alerts",
            "units": "metric"
        }

        try:
            response = requests.get(self.api_url, params=params)
            response.raise_for_status()  # תזרוק שגיאה אם יש תקלה
            data = response.json()
            print(data)

            today_weather = data['daily'][0]
            weather_main = today_weather['weather'][0]['main'].lower()
            rain_amount = today_weather.get('rain', 0)

            if 'rain' in weather_main or rain_amount > 0:
                return True

        except Exception as e:
            print(f"Error checking rain forecast: {e}")

        return False

