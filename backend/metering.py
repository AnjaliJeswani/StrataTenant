import httpx, json
from config import settings

def push_upload_event(user_id: str, filename: str, object_name: str):
    event = json.dumps({
        "user_id": user_id,
        "filename": filename,
        "object_name": object_name,
        "bucket": settings.minio_bucket
    })
    response = httpx.post(
        f"{settings.upstash_redis_url}/lpush/upload_events",
        headers={"Authorization": f"Bearer {settings.upstash_redis_token}"},
        json=[event]
    )
    print("UPSTASH PUSH STATUS:", response.status_code)
    print("UPSTASH PUSH BODY:", response.text)