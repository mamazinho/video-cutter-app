import uuid

from django.db import models
from django.utils import timezone


class VideoAsset(models.Model):
    sha256 = models.CharField(max_length=64, db_index=True)
    original_filename = models.CharField(max_length=255)
    r2_object_key = models.CharField(max_length=500)
    size_bytes = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.original_filename} ({self.sha256[:12]})"


class OrderRequest(models.Model):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "Aguardando pagamento"
        PROCESSING = "processing", "Processando"
        COMPLETED = "completed", "Concluído"
        FAILED = "failed", "Falhou"

    reference = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    email = models.EmailField()
    requested_cuts = models.PositiveSmallIntegerField()
    amount_cents = models.PositiveIntegerField()
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING_PAYMENT)
    video_asset = models.ForeignKey(VideoAsset, on_delete=models.PROTECT, related_name="orders")
    mercadopago_preference_id = models.CharField(max_length=120, blank=True)
    mercadopago_payment_id = models.CharField(max_length=120, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def mark_failed(self, reason: str) -> None:
        self.status = self.Status.FAILED
        self.failure_reason = reason
        self.save(update_fields=["status", "failure_reason", "updated_at"])

    def mark_completed(self) -> None:
        self.status = self.Status.COMPLETED
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at", "updated_at"])

    def __str__(self) -> str:
        return f"{self.reference} - {self.email}"

    @property
    def amount_brl(self) -> str:
        return f"{self.amount_cents / 100:.2f}".replace(".", ",")


class ClipAsset(models.Model):
    order = models.ForeignKey(OrderRequest, on_delete=models.CASCADE, related_name="clips")
    video_asset = models.ForeignKey(VideoAsset, on_delete=models.PROTECT, related_name="clips")
    clip_index = models.PositiveSmallIntegerField()
    r2_object_key = models.CharField(max_length=500)
    signed_url = models.URLField(max_length=1000)
    signed_url_expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("order", "clip_index")
        ordering = ["clip_index"]


class PaymentEvent(models.Model):
    order = models.ForeignKey(OrderRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name="payment_events")
    event_type = models.CharField(max_length=120)
    payment_id = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=120, blank=True)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
