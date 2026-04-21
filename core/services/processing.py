import subprocess
import tempfile
import threading
from pathlib import Path

from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from core.models import ClipAsset, OrderRequest
from core.services.storage import download_to_path, generate_signed_url, upload_local_file


def find_reusable_completed_order(order: OrderRequest) -> OrderRequest | None:
    return (
        OrderRequest.objects.filter(
            status=OrderRequest.Status.COMPLETED,
            video_asset=order.video_asset,
            requested_cuts=order.requested_cuts,
        )
        .exclude(id=order.id)
        .prefetch_related("clips")
        .order_by("-completed_at")
        .first()
    )


def trigger_async_processing(order_id: int) -> None:
    thread = threading.Thread(target=process_order, args=(order_id,), daemon=True)
    thread.start()


def process_order(order_id: int) -> None:
    order = OrderRequest.objects.select_related("video_asset").get(id=order_id)
    try:
        reusable = find_reusable_completed_order(order)
        if reusable and reusable.clips.exists():
            _reuse_clips(order, reusable)
            order.mark_completed()
            _send_completion_email(order)
            return

        _generate_clips(order)
        order.mark_completed()
        _send_completion_email(order)
    except Exception as exc:  # pragma: no cover
        order.mark_failed(str(exc))


def _video_duration_seconds(input_path: str) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            input_path,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return max(1.0, float(result.stdout.strip()))


def _generate_clips(order: OrderRequest) -> None:
    with tempfile.TemporaryDirectory(prefix="autocut-") as workdir:
        input_path = str(Path(workdir) / "source")
        download_to_path(order.video_asset.r2_object_key, input_path)
        duration = _video_duration_seconds(input_path)
        part_duration = max(1.0, duration / order.requested_cuts)

        with transaction.atomic():
            order.clips.all().delete()
            for index in range(order.requested_cuts):
                start = index * part_duration
                output = Path(workdir) / f"clip_{index + 1}.mp4"
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-ss",
                        f"{start:.2f}",
                        "-i",
                        input_path,
                        "-t",
                        f"{part_duration:.2f}",
                        "-c:v",
                        "libx264",
                        "-c:a",
                        "aac",
                        str(output),
                    ],
                    check=True,
                    capture_output=True,
                )

                object_key = f"clips/{order.reference}/clip_{index + 1}.mp4"
                upload_local_file(str(output), object_key)
                signed_url, expires_at = generate_signed_url(object_key)

                ClipAsset.objects.create(
                    order=order,
                    video_asset=order.video_asset,
                    clip_index=index + 1,
                    r2_object_key=object_key,
                    signed_url=signed_url,
                    signed_url_expires_at=expires_at,
                )


def _reuse_clips(order: OrderRequest, reusable: OrderRequest) -> None:
    with transaction.atomic():
        order.clips.all().delete()
        for clip in reusable.clips.all():
            signed_url, expires_at = generate_signed_url(clip.r2_object_key)
            ClipAsset.objects.create(
                order=order,
                video_asset=order.video_asset,
                clip_index=clip.clip_index,
                r2_object_key=clip.r2_object_key,
                signed_url=signed_url,
                signed_url_expires_at=expires_at,
            )


def _send_completion_email(order: OrderRequest) -> None:
    lines = [
        "Seu processamento no autocut foi concluído!",
        "",
        f"Pedido: {order.reference}",
        "Links dos cortes:",
    ]
    for clip in order.clips.all():
        lines.append(f"Corte {clip.clip_index}: {clip.signed_url}")
    lines.append("")
    lines.append("Os links são assinados e expiram automaticamente.")

    send_mail(
        subject="[autocut] seus cortes estão prontos",
        message="\n".join(lines),
        from_email=None,
        recipient_list=[order.email],
        fail_silently=False,
    )
