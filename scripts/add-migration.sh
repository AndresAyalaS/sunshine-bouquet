#!/usr/bin/env bash
# Genera (o agrega) una migración de EF Core. Uso: scripts/add-migration.sh InitialCreate
set -euo pipefail
cd "$(dirname "$0")/../backend"

dotnet tool restore >/dev/null 2>&1 || dotnet tool install --global dotnet-ef --version 8.0.11 || true

dotnet ef migrations add "${1:?Indica el nombre de la migración}" \
  --project src/SunshineBouquet.Infrastructure \
  --startup-project src/SunshineBouquet.Api \
  --output-dir Persistence/Migrations
