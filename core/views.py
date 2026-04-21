import json

from django.contrib import messages
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from core.forms import OrderCreateForm
from core.models import OrderRequest, PaymentEvent
from core.services.mercadopago import MercadoPagoError, create_checkout, fetch_payment
from core.services.pricing import calculate_amount_cents
from core.services.processing import trigger_async_processing
from core.services.storage import StorageConfigurationError, get_or_create_video_asset


@require_http_methods(["GET", "POST"])
def landing(request: HttpRequest) -> HttpResponse:
    form = OrderCreateForm(request.POST or None, request.FILES or None)

    if request.method == "POST" and form.is_valid():
        requested_cuts = form.cleaned_data["requested_cuts"]
        amount_cents = calculate_amount_cents(requested_cuts)
        try:
            video_asset = get_or_create_video_asset(form.cleaned_data["video_file"])
        except StorageConfigurationError as exc:
            form.add_error("video_file", str(exc))
            return render(request, "landing.html", {"form": form})

        order = OrderRequest.objects.create(
            email=form.cleaned_data["email"],
            requested_cuts=requested_cuts,
            amount_cents=amount_cents,
            video_asset=video_asset,
        )
        try:
            preference_id, checkout_url = create_checkout(
                order_reference=str(order.reference),
                requested_cuts=requested_cuts,
                amount_cents=amount_cents,
            )
        except MercadoPagoError as exc:
            form.add_error(None, str(exc))
            return render(request, "landing.html", {"form": form})
        order.mercadopago_preference_id = preference_id
        order.save(update_fields=["mercadopago_preference_id", "updated_at"])

        if checkout_url:
            return redirect(checkout_url)
        messages.info(request, "Pedido criado. Aguarde a confirmação de pagamento.")
        return redirect("order-status", reference=order.reference)

    return render(request, "landing.html", {"form": form})


@require_GET
def order_status(request: HttpRequest, reference) -> HttpResponse:
    order = get_object_or_404(OrderRequest.objects.prefetch_related("clips"), reference=reference)
    return render(request, "order_status.html", {"order": order})


@require_POST
def simulate_payment(request: HttpRequest, reference) -> HttpResponse:
    order = get_object_or_404(OrderRequest, reference=reference)
    if order.status == OrderRequest.Status.PENDING_PAYMENT:
        order.status = OrderRequest.Status.PROCESSING
        order.paid_at = timezone.now()
        order.save(update_fields=["status", "paid_at", "updated_at"])
        trigger_async_processing(order.id)
    return redirect("order-status", reference=order.reference)


@csrf_exempt
@require_POST
def mercadopago_webhook(request: HttpRequest) -> JsonResponse:
    payload = json.loads(request.body.decode("utf-8") or "{}")
    event_type = payload.get("type", "unknown")
    payment_id = str(payload.get("data", {}).get("id") or payload.get("id") or "")

    payment_data = {}
    order = None

    if payment_id:
        payment_data = fetch_payment(payment_id)
        reference = payment_data.get("external_reference")
        if reference:
            order = OrderRequest.objects.filter(reference=reference).first()

    PaymentEvent.objects.create(
        order=order,
        event_type=event_type,
        payment_id=payment_id,
        status=payment_data.get("status", ""),
        payload=payload,
    )

    if not order:
        return JsonResponse({"ok": True, "message": "event stored without order"})

    if payment_data.get("status") == "approved" and order.status == OrderRequest.Status.PENDING_PAYMENT:
        order.status = OrderRequest.Status.PROCESSING
        order.paid_at = timezone.now()
        order.mercadopago_payment_id = str(payment_data.get("id", ""))
        order.save(update_fields=["status", "paid_at", "mercadopago_payment_id", "updated_at"])
        trigger_async_processing(order.id)

    return JsonResponse({"ok": True})
