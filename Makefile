.PHONY: infra-up infra-down run-api run-web

infra-up:
	docker compose up -d

infra-down:
	docker compose down

run-api:
	cd apps/api && .venv/bin/uvicorn app:app --reload --port 8001

run-web:
	cd apps/web && npm run dev
