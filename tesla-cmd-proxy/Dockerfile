# Build teslamotors/vehicle-command tesla-http-proxy for TeLog TVCP signing.
FROM golang:1.23-alpine AS build
RUN apk add --no-cache git ca-certificates
RUN git clone --depth 1 https://github.com/teslamotors/vehicle-command.git /src
WORKDIR /src
RUN CGO_ENABLED=0 go build -o /tesla-http-proxy ./cmd/tesla-http-proxy

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /tesla-http-proxy /usr/local/bin/tesla-http-proxy
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 4443
ENTRYPOINT ["/entrypoint.sh"]
