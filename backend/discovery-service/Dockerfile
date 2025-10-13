FROM golang:1.21-alpine

WORKDIR /app

COPY go.mod ./go.mod
COPY go.sum ./go.sum
RUN go mod download

COPY . .

RUN go build -o /discovery-service

EXPOSE 8080

CMD ["/discovery-service"]

