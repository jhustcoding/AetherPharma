# Backend Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o pharmacy-backend cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/pharmacy-backend .
COPY --from=builder /app/.env.demo .env

EXPOSE 8080
CMD ["./pharmacy-backend"]