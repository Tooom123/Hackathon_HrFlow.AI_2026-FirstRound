import asyncio
import json
import websockets

async def test():
    uri = "ws://localhost:8000/interview/ws/31814065-4b74-4f5a-84be-a708f62f82c5"
    async with websockets.connect(uri) as ws:
        # Écoute les messages du serveur (intro + première question)
        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            print(f"[{data['type']}]", {k: v for k, v in data.items() if k != 'audio'})

asyncio.run(test())
