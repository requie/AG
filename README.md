# AEGIS - Autonomous Enterprise Guardian & Intelligence Shield

This repository contains the Minimum Viable Product (MVP) for the AEGIS platform, an AI Agent Security & Governance Platform.

## Project Structure

```
/requie/AG
├── backend/
│   ├── discovery-service/  # Go project for Discovery Service
│   └── guardrails-service/ # Rust project for Guardrails Service
├── frontend/
│   └── aegis-ui/           # React project for Web UI
├── infra/
│   ├── docker-compose.yml  # Local development setup (PostgreSQL, Redis, services)
│   └── kubernetes/         # Helm charts/K8s manifests (future, beyond MVP)
├── .github/
│   └── workflows/
│       └── ci-cd.yml       # GitHub Actions workflows
├── docs/
│   └── # Additional documentation (e.g., API docs, setup guides)
└── README.md
```

## Local Development Setup

To set up the local development environment, ensure you have Docker and Docker Compose installed.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/requie/AG.git
    cd AG
    ```

2.  **Start the services:**
    Navigate to the `infra` directory and start the services using Docker Compose:
    ```bash
    cd infra
    docker-compose up --build
    ```

    This will start:
    *   PostgreSQL (port 5432)
    *   Redis (port 6379)
    *   Discovery Service (Go, port 8080)
    *   Guardrails Service (Rust, port 8081)
    *   AEGIS UI (React, port 3000)

3.  **Access the UI:**
    Once all services are running, you can access the AEGIS UI in your browser at `http://localhost:3000`.

## API Endpoints

### Discovery Service (Go)

*   **Base URL:** `http://localhost:8080`
*   `POST /v1/agents`: Register a new agent.
*   `GET /v1/agents`: List all registered agents.
*   `POST /v1/agents/{id}/claim`: Claim an agent.

### Guardrails Service (Rust)

*   **Base URL:** `http://localhost:8081`
*   `POST /v1/guardrails/evaluate`: Evaluate agent actions against policies.

## Contributing

Refer to the `docs/` directory for more detailed documentation on API specifications, database schemas, and contribution guidelines.
