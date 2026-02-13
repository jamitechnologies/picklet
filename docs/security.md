# Security & Compliance

## Security Posture

### Infrastructure
- **Hosting**: Deployed on Render with managed containers.
- **Database**: Managed Postgres instance with SSL/TLS encryption enforced in transit.
- **Queue**: Redis with TLS encryption.
- **Network**: All traffic served over HTTPS. `Helmet` middleware enforces secure HTTP headers (HSTS, X-Frame-Options, etc.).

### Secrets Management
- Application secrets (`APP_ID`, `PRIVATE_KEY`, `WEBHOOK_SECRET`) are stored as environment variables.
- No secrets are committed to version control.

### Access Control
- GitHub App authentication via private key signature verification.
- Webhook signature verification guarantees request integrity.

## Data Privacy Policy

**Effective Date**: 2026-02-13

### 1. Data Collection
Picket collects the following data to perform schema validation:
- **Repository Metadata**: Owner, name, and PR number.
- **Code Content**: Temporary access to file contents (e.g., `.sql`, `.yml`) within a Pull Request context. We do not store source code.
- **Analysis Results**: Metadata about schema violations found.

### 2. Data Retention
- **Source Code**: Not retained. Files are fetched, analyzed in memory, and discarded immediately after processing.
- **Logs**: Retained for 14 days for debugging and security auditing, then automatically rotated.
- **Database**: Stores only metadata (PR status, check run IDs). No sensitive PII is stored.

### 3. Data Protection
- Data is encrypted in transit using TLS 1.2+.
- Database backups are encrypted at rest (platform managed).

## Compliance
- **GDPR**: We act as a Data Processor. We do not collect personal data from end-users, only developer metadata (GitHub usernames) associated with PRs, which is public information on GitHub.
- **Right to be Forgotten**: Users may request deletion of any stored metadata by contacting support.
