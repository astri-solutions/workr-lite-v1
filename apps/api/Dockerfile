# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM golang:1.23-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Dependências primeiro (cache de camadas)
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o workr-api ./cmd/api

# ── Stage 2: imagem mínima ────────────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/workr-api .

# Diretório para uploads locais (montado como volume)
RUN mkdir -p /app/uploads

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:8080/healthz || exit 1

CMD ["./workr-api"]
