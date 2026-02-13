# Picket User Guide

Picket is a GitHub App that automatically detects breaking schema changes in your Pull Requests. It helps you prevent downstream breakage by enforcing contracts between data producers and consumers.

## 🚀 Quick Start

1.  **Install the App**: Install the Picket GitHub App on your repository.
2.  **Add a Contract**: Create a `picket.yml` file in your repository root (or `contracts/` directory).

```yaml
# picket.yml
version: "1.0"
owner: "data-engineering"
resource:
  type: "postgres-table"
  name: "public.users"
schema:
  columns:
    - name: "id"
      type: "integer"
      nullable: false
    - name: "email"
      type: "text"
      nullable: false
consumers:
  - "marketing-analytics"
```

3.  **Open a PR**: Make a change to your SQL migration or dbt model.
4.  **See Results**: Picket will post a comment on your PR indicating if the change is SAFE or BREAKING.

## 📄 Contract Reference

Picket contracts define the expected state of your data assets.

### File Location
Picket looks for contract files in:
- `picket.yml` (root)
- `contracts/*.yml`
- `contracts/**/*.yml`

### Schema Structure

| Field | Type | Description |
| :--- | :--- | :--- |
| `version` | string | Contract version (e.g. "1.0") |
| `owner` | string | Team or individual responsible for this asset |
| `resource` | object | The data asset being protected |
| `resource.type` | string | `postgres-table`, `dbt-model`, `kafka-topic` |
| `resource.name` | string | Fully qualified name (e.g. `schema.table`) |
| `schema` | object | The expected schema definition |
| `schema.columns` | array | List of column definitions |
| `consumers` | array | List of downstream systems/teams relying on this asset |

#### Column Definition

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | string | Yes | Column name |
| `type` | string | Yes | Data type (e.g. `integer`, `varchar`) |
| `nullable` | boolean | No | Whether nulls are allowed (default: true) |

## ⚙️ Configuration

You can configure Picket behavior by adding a `.picket/config.yml` file.

```yaml
enforcement:
  breaking_changes: "error" # or "warn"
  missing_contract: "warn"  # or "ignore"
```

## ❓ Troubleshooting

### My PR is stuck in "Queued"
- Ensure the GitHub App is installed on the repository.
- Check if the backend worker is running (for self-hosted).

### "Parsing Error" in comments
- **SQL**: Ensure your migration file uses standard PostgreSQL syntax.
- **dbt**: Verify your `dbt_project.yml` is valid and dependencies are installed.

### False Positives
- Picket uses a compatibility matrix to determine breaking changes.
- If a safe change is flagged as breaking, you can override it by adding `picket-ignore` to your PR description.
