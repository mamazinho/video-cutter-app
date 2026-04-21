from django.conf import settings


def calculate_amount_cents(requested_cuts: int) -> int:
    return requested_cuts * settings.CUT_PRICE_CENTS
