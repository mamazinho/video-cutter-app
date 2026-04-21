# autocut (Django MVP)

MVP server-rendered com Django Templates para venda de cortes de vídeo.

## Fluxo do produto

1. Usuário informa e-mail, envia vídeo e quantidade de cortes.
2. Sistema cria `OrderRequest` com status `pending_payment`.
3. Vídeo original é salvo no Cloudflare R2 (`VideoAsset`).
4. Checkout Mercado Pago é criado com valor `cortes x R$10`.
5. Após webhook de pagamento aprovado, pedido vira `processing`.
6. Processamento assíncrono gera cortes (ffmpeg), envia ao R2 e salva `ClipAsset`.
7. E-mail com links assinados é enviado ao usuário.
8. Pedido finaliza em `completed`.

## Estratégia de reaproveitamento para vídeos repetidos

A estratégia usa `sha256` do conteúdo do arquivo (`VideoAsset.sha256`) + `requested_cuts`.

Quando um pedido pago entra em `processing`, o sistema procura um pedido **já concluído** com:
- mesmo `video_asset` (mesmo hash)
- mesma quantidade de cortes
- clips já existentes

Se encontrar, os clips são reaproveitados (sem novo processamento), novos links assinados são gerados e enviados ao novo e-mail.

## Entidades principais

- `VideoAsset`
- `OrderRequest`
- `ClipAsset`
- `PaymentEvent`

## Requisitos locais

- Python 3.12+
- ffmpeg + ffprobe instalados no sistema

## Rodando localmente

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

Acesse: `http://localhost:8000`

### Simulação sem credenciais reais de Mercado Pago

Sem `MERCADOPAGO_ACCESS_TOKEN`, o sistema cria checkout em modo DEV e redireciona para:

`/orders/<reference>/simulate-payment/`

Esse endpoint muda o pedido para `processing` e dispara o fluxo assíncrono local.

## Produção (simples)

- Banco: Postgres (Supabase)
- Armazenamento: Cloudflare R2
- Pagamento: Mercado Pago (webhook para `/payments/webhook/mercadopago/`)
- E-mail: SMTP real via variáveis `EMAIL_*`

## Comandos úteis

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py test
python manage.py check
```
