.PHONY: dev dev-backend dev-frontend test test-backend test-backend-coverage test-frontend test-e2e-ci test-payments-webhooks build build-backend build-frontend lint verify-delivery verify-root-docs audit-quick

dev:
	npm run dev

dev-backend:
	cd backend && npm run dev

dev-frontend:
	npm run dev:web

test:
	npm run test:backend && npm run test

test-backend:
	cd backend && npm test

test-backend-coverage:
	cd backend && npm run test:coverage

test-frontend:
	npm run test

test-e2e-ci:
	npm run test:e2e:ci

# Webhooks paiements (aligné CI — ne lance pas test:db:prepare)
test-payments-webhooks:
	cd backend && npm run test:webhooks

verify-root-docs:
	npm run verify:root-docs

build:
	npm run build && cd backend && npm run build

build-backend:
	cd backend && npm run build

build-frontend:
	npm run build

lint:
	npm run lint

verify-delivery:
	npm run verify:delivery

audit-quick: verify-root-docs lint test-backend test-frontend

