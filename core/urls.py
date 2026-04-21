from django.urls import path

from core import views

urlpatterns = [
    path("", views.landing, name="landing"),
    path("orders/<uuid:reference>/", views.order_status, name="order-status"),
    path("orders/<uuid:reference>/simulate-payment/", views.simulate_payment, name="simulate-payment"),
    path("payments/webhook/mercadopago/", views.mercadopago_webhook, name="mercadopago-webhook"),
]
