from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from auth import get_current_user
from storage import get_upload_url, get_download_url, delete_file, list_files
from metering import push_upload_event
from billing_sync import get_usage, create_order, verify_payment

app = FastAPI()

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.post("/upload-url")
def upload_url(filename: str, user_id: str = Depends(get_current_user)):
    url, object_name = get_upload_url(user_id, filename)
    push_upload_event(user_id, filename, object_name)
    return {"url": url}

@app.get("/files")
def files(user_id: str = Depends(get_current_user)):
    return {"files": list_files(user_id)}

@app.get("/download/{filename}")
def download(filename: str, user_id: str = Depends(get_current_user)):
    return {"url": get_download_url(user_id, filename)}

@app.delete("/files/{filename}")
def delete(filename: str, user_id: str = Depends(get_current_user)):
    delete_file(user_id, filename)
    return {"message": "deleted"}

@app.get("/billing/usage")
def usage(user_id: str = Depends(get_current_user)):
    return get_usage(user_id)

@app.post("/billing/pay")
def pay(user_id: str = Depends(get_current_user)):
    return create_order(user_id)

class VerifyPayload(BaseModel):
    order_id: str
    payment_id: str
    signature: str

@app.post("/billing/verify")
def verify(data: VerifyPayload, user_id: str = Depends(get_current_user)):
    ok = verify_payment(user_id, data.order_id, data.payment_id, data.signature)
    return {"success": ok}

@app.get("/health")
def health():
    return {"status": "ok"}