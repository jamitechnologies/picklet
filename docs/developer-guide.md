# Picket Developer Guide

This guide is for developers contributing to the Picket backend or running a self-hosted instance.

## 🏗️ Architecture

Picket consists of three main components:

1.  **GitHub App**: Receives webhooks from GitHub.
2.  **API Server**: Express.js server that handles webhook events and enqueues jobs.
3.  **Worker**: Background process (BullMQ + Redis) that processes PRs, parses schemas, and reports results.

### Core Modules

- `lib/sql-parser.ts`: Parses SQL migrations using `pgsql-ast-parser`.
- `lib/dbt-manifest.ts`: Parses dbt projects.
- `lib/classifier.ts`: Logic for determining SAFE vs BREAKING changes.
- `lib/validation-engine.ts`: Checks actual schema against contracts.
- `lib/github.ts`: GitHub API client (Octokit).
- `worker.ts`: Main job processor.

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (for Redis/Postgres)
- GitHub App credentials

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/jamitechnologies/picklet.git
    cd picklet/backend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment:
    Copy `.env.example` to `.env` and fill in:
    - `APP_ID`
    - `PRIVATE_KEY`
    - `WEBHOOK_SECRET`
    - `REDIS_HOST`

4.  Start Dependencies:
    ```bash
    docker-compose up -d
    ```

5.  Run Development Server:
    ```bash
    npm run dev
    # In a separate terminal
    npm run worker
    ```

## 🧪 Testing

We use Jest for unit and integration testing.

```bash
# Run all tests
npm test

# Run specific test file
npx jest src/worker.test.ts
```

### Manual Verification
1.  Use `src/scripts/create-test-pr.ts` to create a dummy PR.
2.  Use `src/scripts/simulate-pr-webhook.ts` to trigger the worker locally.

## 🚀 Deployment

# Docker
Build the image:
```bash
docker build -t picket-backend .
```

Run the container:
```bash
docker run -p 3000:3000 --env-file .env picket-backend
```

Make sure to run a separate container or process for the worker:
```bash
docker run --env-file .env picket-backend npm run worker
```
