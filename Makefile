SHELL := /bin/zsh

-include cloudflare.env

PROJECT_NAME ?= wotd
PRODUCTION_BRANCH ?= main
PREVIEW_BRANCH ?= preview
BUILD_DIR ?= out
CUSTOM_DOMAIN ?=
DOMAIN ?=
NODE_VERSION ?= 24.11.1
NVM_SH ?= $(HOME)/.nvm/nvm.sh

NVM_RUN = source "$(NVM_SH)" && nvm use "$(NODE_VERSION)" >/dev/null &&
WRANGLER_ACCOUNT_ENV = $(if $(strip $(CLOUDFLARE_ACCOUNT_ID)),CLOUDFLARE_ACCOUNT_ID="$(CLOUDFLARE_ACCOUNT_ID)",)
DOMAIN_VALUE = $(or $(DOMAIN),$(CUSTOM_DOMAIN))

.PHONY: help cf-login cf-whoami cf-project cf-build cf-deploy cf-preview cf-domain cf-domain-retry cf-domains cf-open

help:
	@echo "make cf-login"
	@echo "make cf-project"
	@echo "make cf-deploy"
	@echo "make cf-preview"
	@echo "make cf-domain DOMAIN=wotd.example.com CF_API_TOKEN=..."
	@echo "make cf-domains CF_API_TOKEN=..."
	@echo "make cf-open"

cf-login:
	$(NVM_RUN) pnpm exec wrangler login

cf-whoami:
	$(NVM_RUN) pnpm exec wrangler whoami

cf-project:
	$(NVM_RUN) $(WRANGLER_ACCOUNT_ENV) pnpm exec wrangler pages project create "$(PROJECT_NAME)" --production-branch="$(PRODUCTION_BRANCH)"

cf-build:
	$(NVM_RUN) pnpm build

cf-deploy:
	$(NVM_RUN) pnpm build
	$(NVM_RUN) $(WRANGLER_ACCOUNT_ENV) pnpm exec wrangler pages deploy "$(BUILD_DIR)" --project-name="$(PROJECT_NAME)" --branch="$(PRODUCTION_BRANCH)"

cf-preview:
	$(NVM_RUN) pnpm build
	$(NVM_RUN) $(WRANGLER_ACCOUNT_ENV) pnpm exec wrangler pages deploy "$(BUILD_DIR)" --project-name="$(PROJECT_NAME)" --branch="$(PREVIEW_BRANCH)"

cf-domain cf-domain-retry cf-domains: export PROJECT_NAME := $(PROJECT_NAME)
cf-domain cf-domain-retry cf-domains: export CUSTOM_DOMAIN := $(CUSTOM_DOMAIN)
cf-domain cf-domain-retry cf-domains: export DOMAIN := $(DOMAIN)
cf-domain cf-domain-retry cf-domains: export ACCOUNT_ID := $(ACCOUNT_ID)
cf-domain cf-domain-retry cf-domains: export CF_ACCOUNT_ID := $(CF_ACCOUNT_ID)
cf-domain cf-domain-retry cf-domains: export CLOUDFLARE_ACCOUNT_ID := $(CLOUDFLARE_ACCOUNT_ID)
cf-domain cf-domain-retry cf-domains: export CF_API_TOKEN := $(CF_API_TOKEN)
cf-domain cf-domain-retry cf-domains: export CLOUDFLARE_API_TOKEN := $(CLOUDFLARE_API_TOKEN)

cf-domain:
	$(NVM_RUN) node scripts/cloudflare-pages-domain.mjs create

cf-domain-retry:
	$(NVM_RUN) node scripts/cloudflare-pages-domain.mjs retry

cf-domains:
	$(NVM_RUN) node scripts/cloudflare-pages-domain.mjs list

cf-open:
	@if [ -n "$(DOMAIN_VALUE)" ]; then \
		open "https://$(DOMAIN_VALUE)"; \
	else \
		open "https://$(PROJECT_NAME).pages.dev"; \
	fi
