import razorpay, hmac, hashlib
from datetime import datetime, timedelta, timezone
from config import settings
from supabase import create_client

supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
rz = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))

def calculate_bill(size_bytes: int) -> float:
    gb = size_bytes / (1024 ** 3)
    if gb <= 5:
        return 0.0
    elif gb <= 50:
        return (gb - 5) * 2.0
    elif gb <= 500:
        return (45 * 2.0) + (gb - 50) * 1.5
    else:
        return (45 * 2.0) + (450 * 1.5) + (gb - 500) * 1.0

def get_usage(user_id: str):
    result = supabase.table("usage").select("size_bytes").eq("user_id", user_id).execute()
    total_bytes = sum(row["size_bytes"] for row in result.data)
    bill_inr = calculate_bill(total_bytes)
    return {"total_bytes": total_bytes, "bill_inr": round(bill_inr, 2)}

def get_weekly_usage(user_id: str):
    result = supabase.table("usage").select("size_bytes, uploaded_at").eq("user_id", user_id).order("uploaded_at").execute()
    rows = result.data

    running_total = 0
    daily_cumulative = {}
    for row in rows:
        running_total += row["size_bytes"]
        day = row["uploaded_at"][:10]
        daily_cumulative[day] = running_total

    today = datetime.now(timezone.utc).date()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]

    output = []
    last_known = 0
    for day_str, total in sorted(daily_cumulative.items()):
        if datetime.fromisoformat(day_str).date() < days[0]:
            last_known = total

    for d in days:
        d_str = d.isoformat()
        if d_str in daily_cumulative:
            last_known = daily_cumulative[d_str]
        output.append({
            "day": d.strftime("%a"),
            "gb": round(last_known / (1024 ** 3), 3)
        })
    return output

def create_order(user_id: str):
    usage = get_usage(user_id)
    amount_paise = int(usage["bill_inr"] * 100)
    if amount_paise == 0:
        return {"message": "Nothing to pay — you are in the free tier"}
    order = rz.order.create({"amount": amount_paise, "currency": "INR"})
    supabase.table("billing_records").insert({
        "user_id":             user_id,
        "amount_paise":        amount_paise,
        "razorpay_order_id":   order["id"],
        "usage_gb_at_payment": usage["total_bytes"] / (1024**3)
    }).execute()
    return {
        "order_id":     order["id"],
        "amount_paise": amount_paise,
        "key":          settings.razorpay_key_id
    }

def verify_payment(user_id: str, order_id: str, payment_id: str, signature: str):
    msg = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(
        settings.razorpay_key_secret.encode(),
        msg,
        hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return False
    supabase.table("billing_records").update(
        {"razorpay_payment_id": payment_id}
    ).eq("razorpay_order_id", order_id).execute()
    supabase.table("usage").delete().eq("user_id", user_id).execute()
    return True