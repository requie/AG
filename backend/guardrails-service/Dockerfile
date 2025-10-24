FROM rust:1.70-slim-buster as builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./ 

# Build a dummy project to cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src target/release/deps/* target/release/examples/*

# Copy source code and build actual project
COPY src ./src
RUN cargo build --release

FROM debian:buster-slim

# Install ca-certificates for HTTPS connections
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/guardrails-service .

EXPOSE 8081

CMD ["./guardrails-service"]

