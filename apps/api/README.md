# PDSA-Flow-AI API

API service for the PDSA-Flow-AI project, built with FastAPI, SQLAlchemy 2.0 (Async), and PostgreSQL.

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.12+
- Docker & Docker Compose (usually run from project root)

### 2. Setup Environment
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Database & Services
Start the PostgreSQL instance (from project root):
```bash
make infra-up
```
*Database runs on port `5435` to avoid common conflicts.*

### 4. Run Migrations
```bash
alembic upgrade head
```

### 5. Run Application
```bash
uvicorn app:app --reload --port 8001
```

## 🛠 Tech Stack
- **Web Framework:** [FastAPI](https://fastapi.tiangolo.com/)
- **Database Engine:** [PostgreSQL](https://www.postgresql.org/)
- **Async Driver:** [asyncpg](https://magicstack.github.io/asyncpg/current/)
- **ORM:** [SQLAlchemy 2.0](https://www.sqlalchemy.org/)
- **Migrations:** [Alembic](https://alembic.sqlalchemy.org/)

## 📂 Project Structure
```text
apps/api/
├── alembic/            # Database migration scripts
├── data/               # Persistent data (Postgres volumes)
├── src/
│   ├── api/            # API Route handlers
│   ├── core/           # Global configuration & security
│   ├── db/             # Database session & base classes
│   ├── models/         # SQLAlchemy models
│   └── schemas/         # Pydantic validation models
└── .env                # Local environment variables
```
