import hashlib
import mimetypes
import uuid
from datetime import timedelta

import boto3
from botocore.client import Config
from django.conf import settings
from django.utils import timezone

from core.models import VideoAsset


class StorageConfigurationError(RuntimeError):
    pass


def _client():
    if not all([settings.R2_ENDPOINT_URL, settings.R2_ACCESS_KEY_ID, settings.R2_SECRET_ACCESS_KEY, settings.R2_BUCKET_NAME]):
        raise StorageConfigurationError("Configuração do Cloudflare R2 incompleta.")

    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def hash_uploaded_file(uploaded_file) -> tuple[str, int]:
    hasher = hashlib.sha256()
    size = 0
    for chunk in uploaded_file.chunks():
        hasher.update(chunk)
        size += len(chunk)
    uploaded_file.seek(0)
    return hasher.hexdigest(), size


def get_or_create_video_asset(uploaded_file) -> VideoAsset:
    digest, size = hash_uploaded_file(uploaded_file)
    existing = VideoAsset.objects.filter(sha256=digest).first()
    if existing:
        return existing

    safe_name = uploaded_file.name.replace(" ", "_")
    object_key = f"originals/{digest}/{uuid.uuid4()}-{safe_name}"
    content_type = uploaded_file.content_type or mimetypes.guess_type(uploaded_file.name)[0] or "application/octet-stream"
    _client().upload_fileobj(uploaded_file, settings.R2_BUCKET_NAME, object_key, ExtraArgs={"ContentType": content_type})
    uploaded_file.seek(0)

    return VideoAsset.objects.create(
        sha256=digest,
        original_filename=uploaded_file.name,
        r2_object_key=object_key,
        size_bytes=size,
    )


def upload_local_file(local_path: str, object_key: str) -> None:
    _client().upload_file(local_path, settings.R2_BUCKET_NAME, object_key, ExtraArgs={"ContentType": "video/mp4"})


def download_to_path(object_key: str, local_path: str) -> None:
    _client().download_file(settings.R2_BUCKET_NAME, object_key, local_path)


def generate_signed_url(object_key: str) -> tuple[str, timezone.datetime]:
    expires_seconds = settings.SIGNED_URL_EXPIRATION_SECONDS
    url = _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.R2_BUCKET_NAME, "Key": object_key},
        ExpiresIn=expires_seconds,
    )
    return url, timezone.now() + timedelta(seconds=expires_seconds)
