import requests
from django.conf import settings


class MercadoPagoError(RuntimeError):
    pass


def create_checkout(*, order_reference: str, requested_cuts: int, amount_cents: int) -> tuple[str, str]:
    if not settings.MERCADOPAGO_ACCESS_TOKEN:
        fake_url = f"{settings.MERCADOPAGO_APP_BASE_URL}/orders/{order_reference}/simulate-payment/"
        return f"dev-{order_reference}", fake_url

    url = "https://api.mercadopago.com/checkout/preferences"
    headers = {"Authorization": f"Bearer {settings.MERCADOPAGO_ACCESS_TOKEN}", "Content-Type": "application/json"}
    payload = {
        "external_reference": order_reference,
        "notification_url": settings.MERCADOPAGO_WEBHOOK_URL or None,
        "items": [
            {
                "title": f"autocut - {requested_cuts} cortes",
                "quantity": 1,
                "currency_id": "BRL",
                "unit_price": amount_cents / 100,
            }
        ],
        "back_urls": {
            "success": f"{settings.MERCADOPAGO_APP_BASE_URL}/orders/{order_reference}/",
            "pending": f"{settings.MERCADOPAGO_APP_BASE_URL}/orders/{order_reference}/",
            "failure": f"{settings.MERCADOPAGO_APP_BASE_URL}/orders/{order_reference}/",
        },
    }
    response = requests.post(url, json=payload, headers=headers, timeout=20)
    if response.status_code >= 400:
        raise MercadoPagoError(f"Erro ao criar checkout: {response.text}")

    data = response.json()
    return data.get("id", ""), data.get("init_point", "")


def fetch_payment(payment_id: str) -> dict:
    if not settings.MERCADOPAGO_ACCESS_TOKEN:
        return {"id": payment_id, "status": "approved", "external_reference": ""}

    response = requests.get(
        f"https://api.mercadopago.com/v1/payments/{payment_id}",
        headers={"Authorization": f"Bearer {settings.MERCADOPAGO_ACCESS_TOKEN}"},
        timeout=20,
    )
    if response.status_code >= 400:
        raise MercadoPagoError(f"Erro ao consultar pagamento: {response.text}")
    return response.json()
