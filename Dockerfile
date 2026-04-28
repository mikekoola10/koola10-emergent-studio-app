FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN go build -o agent main.go

FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/agent .
# We don't copy the data directory to ensure it is persistent if mounted,
# but for this task we include it in the build if needed or assume it exists.
COPY data ./data
EXPOSE 8080
CMD ["./agent"]
