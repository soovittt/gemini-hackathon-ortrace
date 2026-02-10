# Build stage
FROM rust:1-bookworm AS builder
WORKDIR /app

# System deps for crates that link against OpenSSL (reqwest, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache dependencies
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs && cargo build --release && rm -rf src

# Build application (migrations embedded at compile time by sqlx::migrate!)
COPY src ./src
COPY migrations ./migrations
RUN touch src/main.rs && cargo build --release

# Runtime stage
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/video-analyzer-api /app/video-analyzer-api

# Cloud Run sets PORT (default 8080)
ENV PORT=8080
EXPOSE 8080

CMD ["/app/video-analyzer-api"]
