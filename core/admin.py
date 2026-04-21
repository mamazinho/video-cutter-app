from django.contrib import admin

from core.models import ClipAsset, OrderRequest, PaymentEvent, VideoAsset


@admin.register(VideoAsset)
class VideoAssetAdmin(admin.ModelAdmin):
    list_display = ("id", "original_filename", "sha256", "created_at")
    search_fields = ("sha256", "original_filename")


@admin.register(OrderRequest)
class OrderRequestAdmin(admin.ModelAdmin):
    list_display = ("reference", "email", "requested_cuts", "status", "amount_cents", "created_at")
    search_fields = ("email", "reference")
    list_filter = ("status",)


@admin.register(ClipAsset)
class ClipAssetAdmin(admin.ModelAdmin):
    list_display = ("order", "clip_index", "created_at")


@admin.register(PaymentEvent)
class PaymentEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "payment_id", "status", "created_at")
