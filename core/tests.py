from django.test import TestCase
from django.utils import timezone

from core.models import ClipAsset, OrderRequest, VideoAsset
from core.services.pricing import calculate_amount_cents
from core.services.processing import find_reusable_completed_order


class PricingTests(TestCase):
    def test_amount_is_ten_reais_per_cut(self):
        self.assertEqual(calculate_amount_cents(1), 1000)
        self.assertEqual(calculate_amount_cents(4), 4000)


class ReuseStrategyTests(TestCase):
    def test_reuses_completed_order_with_same_video_and_cuts(self):
        video = VideoAsset.objects.create(
            sha256="abc123",
            original_filename="video.mp4",
            r2_object_key="originals/x.mp4",
            size_bytes=123,
        )
        reusable = OrderRequest.objects.create(
            email="old@example.com",
            requested_cuts=2,
            amount_cents=2000,
            status=OrderRequest.Status.COMPLETED,
            video_asset=video,
        )
        ClipAsset.objects.create(
            order=reusable,
            video_asset=video,
            clip_index=1,
            r2_object_key="clips/reusable/clip_1.mp4",
            signed_url="https://example.com/clip_1",
            signed_url_expires_at=timezone.now(),
        )

        order = OrderRequest.objects.create(
            email="new@example.com",
            requested_cuts=2,
            amount_cents=2000,
            status=OrderRequest.Status.PROCESSING,
            video_asset=video,
        )

        found = find_reusable_completed_order(order)
        self.assertIsNotNone(found)
        self.assertEqual(found.id, reusable.id)
