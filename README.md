# 🛡️ Picket

**GitHub-native schema contracts that catch breaking changes before they break production**

Picket is a lightweight CI tool that prevents schema changes from silently breaking your data pipelines, microservices, and analytics.

---

## 🚀 Features Implemented

### 1. Foundation & Environment
- **Backend Service**: Node.js + TypeScript setup with Express.
- **Local Database**: Dockerized Postgres and Redis environment.
- **Health Checks**: Automated service health monitoring.

### 2. dbt Schema Parsing
- **Schema Extraction**: Automatically parses `schema.yml` files from dbt projects.
- **Model Discovery**: Identifies models and their columns.
- **Support**: Handles standard dbt project structures.

### 3. Schema Diff Engine
- **Breaking Change Detection**: Identifies removed columns and incompatible type changes.
- **Safe Change Detection**: Recognizes added columns and documentation updates.
- **Detailed Reporting**: Generates diffs showing exactly what changed between versions.

### 4. Postgres Migration Parsing
- **SQL Parsing**: Robust parsing of raw SQL migration files (`.sql`).
- **Change Extraction**: Detects `CREATE TABLE`, `ALTER TABLE`, `ADD COLUMN`, and `modified COLUMN` operations.
- **Migration Support**: Understands standard SQL migration patterns.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/picket.git
   cd picket
   ```

2. **Start the environment**
   ```bash
   docker compose up -d
   ```

3. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

4. **Run the server**
   ```bash
   npm run dev
   ```

### Running POC Scripts

You can verify the core features by running the included test scripts:

- **Test dbt Parser**:
  ```bash
  npx ts-node src/scripts/test-parser.ts
  ```

- **Test Schema Diff**:
  ```bash
  npx ts-node src/scripts/test-diff.ts
  ```

- **Test SQL Parser**:
  ```bash
  npx ts-node src/scripts/test-sql-parser.ts
  ```

---

##  license
[MIT](LICENSE)
