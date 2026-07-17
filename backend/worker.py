import httpx, json, time
from config import settings
from storage import get_file_size
from supabase import create_client

supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)

def pop_event():
    response = httpx.post(
        f"{settings.upstash_redis_url}/rpop/upload_events",
        headers={"Authorization": f"Bearer {settings.upstash_redis_token}"}
    )
    result = response.json().get("result")
    if not result:
        return None
    parsed = json.loads(result)
    if isinstance(parsed, list):
        parsed = json.loads(parsed[0])
    return parsed

def process_event(event):
    try:
        size = get_file_size(event["object_name"])
        supabase.table("usage").insert({
            "user_id":    event["user_id"],
            "filename":   event["filename"],
            "size_bytes": size,
            "bucket":     event["bucket"]
        }).execute()
        print(f"Recorded: {event['filename']} = {size} bytes")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Worker started, waiting for events...")
    while True:
        event = pop_event()
        if event:
            print("GOT EVENT:", event)
            process_event(event)
        else:
            print("no event, sleeping...")
            time.sleep(2)