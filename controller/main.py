import json
import time
from websocket import WebSocketApp
from engine import SmartGardenEngine
from handlers.add_plant_handler import handle as handle_add_plant

# יצירת אובייקט הבקר הראשי
smart_engine = SmartGardenEngine()

def on_open(ws):
    print("✅ Connected to server.")
    ws.send(json.dumps({"type": "register_pi"}))

def on_message(ws, message):
    try:
        data = json.loads(message)
        msg_type = data.get("type")

        if msg_type == "add_plant":
            handle_add_plant(data, ws, smart_engine)
        else:
            print(f"⚠️ Unknown message type: {msg_type}")

    except Exception as e:
        print(f"❌ Error while handling message: {e}")

def on_close(ws, close_status_code, close_msg):
    print("🔌 Disconnected from server.")

def on_error(ws, error):
    print(f"❗ WebSocket error: {error}")

if __name__ == "__main__":
    while True:
        try:
            ws = WebSocketApp(
                "ws://YOUR_SERVER_IP:3000",  # ← החליפי בכתובת האמיתית
                on_open=on_open,
                on_message=on_message,
                on_close=on_close,
                on_error=on_error
            )
            ws.run_forever()
        except Exception as e:
            print(f"🔁 Reconnecting after error: {e}")
            time.sleep(5)
