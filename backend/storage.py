from minio import Minio
from datetime import timedelta
from config import settings

client = Minio(
    settings.minio_endpoint,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=False
)

def get_upload_url(user_id: str, filename: str):
    object_name = f"{user_id}/{filename}"
    url = client.presigned_put_object(
        settings.minio_bucket,
        object_name,
        expires=timedelta(minutes=15)
    )
    return url, object_name

def get_download_url(user_id: str, filename: str):
    object_name = f"{user_id}/{filename}"
    url = client.presigned_get_object(
        settings.minio_bucket,
        object_name,
        expires=timedelta(hours=1)
    )
    return url

def delete_file(user_id: str, filename: str):
    object_name = f"{user_id}/{filename}"
    client.remove_object(settings.minio_bucket, object_name)

def get_file_size(object_name: str):
    stat = client.stat_object(settings.minio_bucket, object_name)
    return stat.size

def list_files(user_id: str):
    objects = client.list_objects(settings.minio_bucket, prefix=f"{user_id}/")
    result = []
    for obj in objects:
        name = obj.object_name.split("/", 1)
        if len(name) > 1 and name[1]:
            result.append(name[1])
    return result