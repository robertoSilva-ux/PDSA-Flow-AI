# PDSA-Flow-AI API - Agent Instructions

This project is the FastAPI API focused on Process Design and Simulation with AI.

## 🏗 Architecture Decisions

- **Async Everywhere:** Use `async/await` for all I/O bound operations. SQLAlchemy 2.0 must use the `asyncpg` driver.
- **Database Port:** Host port `5435` maps to container `5432` to avoid conflicts with local Postgres installs.
- **Model Inheritance:** All SQLAlchemy models must inherit from `src.db.base_class.Base` to benefit from automatic `__tablename__` generation.
- **Environment Variables:** Credentials and connection strings are managed via `.env`. Never hardcode these.

## 🛠 Operational Commands

- **Run API:** `uvicorn app:app --reload --port 8001` (from `apps/api`).
- **Manage Docker DB:** `make infra-up` / `make infra-down` (from project root).
- **Database Migrations:**
  - Create: `alembic revision --autogenerate -m "description"`
  - Apply: `alembic upgrade head`

## 📂 Key Files & Locations

- `src/db/session.py`: Database engine and async session configuration.
- `src/db/base.py`: Central import point for Alembic (must import all models here).
- `src/models/`: Entity definitions (User, Flow, etc.).
- `.env`: Database connection string (`DATABASE_URL`).

## 📋 Progress Tracker

- [x] Initial FastAPI environment setup.
- [x] Dockerized PostgreSQL (Port 5435).
- [x] Alembic migration system (Async support).
- [x] Core SQLAlchemy models (User, Flow).
- [ ] Pydantic Schemas for validation.
- [ ] CRUD implementations for Users and Flows.
- [ ] Authentication (JWT).
- [ ] Integration with AI/Agentic workflows.

## ⚠️ Known Issues / Constraints

- **Ports:** Port 8000 (Apache) and Port 5432/5433/5434 (Postgres) are occupied on the host. Use **8001** for FastAPI and **5435** for Docker Postgres.
