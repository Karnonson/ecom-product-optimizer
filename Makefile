
SHELL := /usr/bin/env bash
.PHONY: dev

dev:
	@command -v pnpm >/dev/null 2>&1 || { echo "pnpm not found. Install pnpm or edit this Makefile to use npm/yarn."; exit 1; }
	@echo "Starting backend and frontend (logs prefixed)..."
	@pnpm --prefix backend run dev > >(sed 's/^/[backend] /') 2>&1 & \
	BACK_PID=$$!; \
	pnpm --prefix frontend run dev > >(sed 's/^/[frontend] /') 2>&1 & \
	FRONT_PID=$$!; \
	trap 'echo "Stopping children..."; kill $$BACK_PID $$FRONT_PID 2>/dev/null || true' INT TERM EXIT; \
	wait $$BACK_PID $$FRONT_PID

