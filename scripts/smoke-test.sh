#!/usr/bin/env bash
# Prueba de humo contra la API en marcha. Uso: scripts/smoke-test.sh [url]
# Por el gateway:  scripts/smoke-test.sh http://localhost:4000/
# Directo a la API: scripts/smoke-test.sh http://localhost:5000/graphql
set -euo pipefail

URL="${1:-http://localhost:4000/}"
gql() { curl -sS -X POST "$URL" -H 'Content-Type: application/json' -d "$1"; echo; }

echo "== crear orden"
RESP=$(curl -sS -X POST "$URL" -H 'Content-Type: application/json' -d '{"query":"mutation { createOrder(input:{customerStore:\"Flower Shop NYC\",originCountry:\"Colombia\",destinationCity:\"Miami\",bouquetQuantity:300}){ id status } }"}')
echo "$RESP"
ID=$(echo "$RESP" | sed -E 's/.*"id":"([^"]+)".*/\1/')

echo "== CREATED -> IN_TRANSIT";  gql "{\"query\":\"mutation { updateOrderStatus(id:\\\"$ID\\\", status:IN_TRANSIT){ status } }\"}"
echo "== transición inválida (IN_TRANSIT -> CANCELLED)"; gql "{\"query\":\"mutation { updateOrderStatus(id:\\\"$ID\\\", status:CANCELLED){ status } }\"}"
echo "== IN_TRANSIT -> DELIVERED"; gql "{\"query\":\"mutation { updateOrderStatus(id:\\\"$ID\\\", status:DELIVERED){ status } }\"}"
echo "== detalle";                 gql "{\"query\":\"{ order(id:\\\"$ID\\\"){ id customerStore status createdAt } }\"}"
echo "== filtro DELIVERED";        gql '{"query":"{ orders(status:DELIVERED){ id status } }"}'
echo "== stats";                   gql '{"query":"{ orderStats { total byStatus { status count } } }"}'
