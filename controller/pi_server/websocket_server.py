import asyncio
import websockets
import json

async def handler(websocket):
    async for message in websocket:
        data = json.loads(message)

        if data["action"] == "irrigate":
            plant_id = data["plant_id"]
            print(f" Irrigating plant {plant_id}")
            # engine.water_plant(plant_id)

        await websocket.send(json.dumps({"status": "ok"}))

async def main():
    async with websockets.serve(handler, "0.0.0.0", 8765):
        print(" WebSocket server started")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
