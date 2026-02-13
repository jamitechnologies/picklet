# 🛡️ Picket

**GitHub-native schema contracts that catch breaking changes before they break production**

> ⚠️ **Status**: Early development. Not ready for production use yet.

---

## What is Picket?

Picket prevents schema changes from silently breaking your data pipelines, microservices, and analytics.

### The Problem
- A product team renames a database column
- A data engineer changes a dbt model's output  
- A backend team modifies an event schema
- **Result**: Downstream reports break, ML jobs fail, microservices crash

### The Solution
Picket sits in your GitHub CI and automatically:
- ✅ Detects schema changes in Pull Requests
- ✅ Enforces data contracts defined in your repo
- ✅ Flags breaking changes before they merge
- ✅ Posts clear PR comments showing impact

---

## Supported Schema Types (Roadmap)

- **dbt models** (SQL transformations)
- **PostgreSQL schemas** (via migrations)
- **Kafka Avro schemas** (planned)
- **MySQL schemas** (planned)

---

## Quick Start (Coming Soon)

Picket is currently in early development. Interested in early access?

**Contact**: j.vivekvamsi@gmail.com

---

## Project Status

**Current milestone**: Core schema parsing engine (dbt + Postgres)

**Roadmap**:
- [ ] dbt model parser
- [ ] Postgres migration parser  
- [ ] Schema diff engine
- [ ] Contract validation
- [ ] GitHub App integration
- [ ] PR comment generation
- [ ] Beta testing with 5-10 design partners
- [ ] Public launch (targeting Q2 2026)

---

## License

Picket is source-available under the **Business Source License 1.1**.

### What this means:
- ✅ You can read and inspect the code
- ✅ You can use it for non-production purposes
- ✅ Small organizations (<$10M revenue) can self-host for production
- ✅ You can modify and contribute back
- ❌ You cannot sell a competing schema contract service using this code

After **February 13, 2029** (3 years), this code becomes fully open-source under Apache License 2.0.

**Need a commercial license?** Contact j.vivekvamsi@gmail.com

See [LICENSE](./LICENSE) for full details.

---

## Contributing

We welcome contributions! Have ideas or found a bug?

- **Email**: j.vivekvamsi@gmail.com
- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions (coming soon)

---

## Contact

- **Company**: Jami Technologies
- **Maintainer**: Vivek Jami
- **Email**: j.vivekvamsi@gmail.com
- **LinkedIn**: [linkedin.com/in/vivek-jami](https://linkedin.com/in/vivek-jami)
- **Location**: Hyderabad, India

---

## Acknowledgments

Picket builds on the shoulders of giants:
- [dbt](https://github.com/dbt-labs/dbt-core) for pioneering data contracts
- [Buf](https://buf.build) for protobuf breaking change detection
- Data Contract [specification](https://datacontract.com) for standardizing contracts
