from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_jwt_secret: str
    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str
    upstash_redis_url: str
    upstash_redis_token: str
    razorpay_key_id: str
    razorpay_key_secret: str

    class Config:
        env_file = '.env'

settings = Settings()
