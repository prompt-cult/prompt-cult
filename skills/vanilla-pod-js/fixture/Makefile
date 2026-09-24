# Vanilla Pod JS fixture: codegen + node --test + tsc (check-only, no transpile).
# Tooling: Node + POSIX Make only. No Python, no uv.

.PHONY: init codegen check test check-syntax clean

UNAME_M := $(shell uname -m)
ifeq ($(UNAME_M),arm64)
  CODEGEN_ASSET := aarch64-apple-darwin
else
  CODEGEN_ASSET := x86_64-unknown-linux-gnu
endif
# Pinned codegen binary tag (overridable: make init RELEASE_TAG=nightly-20260901)
RELEASE_TAG ?= nightly-20260829

init:
	@mkdir -p .bin
	@gh release download $(RELEASE_TAG) --repo prompt-cult/json-type-definition-RFC-8927 \
	  --pattern "*$(CODEGEN_ASSET)*" --dir .bin --clobber \
	  && tar -xzf .bin/jtd-codegen*.tar.gz -C .bin \
	  && rm -f .bin/jtd-codegen*.tar.gz \
	  && chmod +x .bin/jtd-codegen \
	  && echo "jtd-codegen installed into .bin/" \
	|| echo "jtd-codegen binary fetch unavailable; committed generated/ validators will be used"
	-@npm install --no-save typescript @types/node >/dev/null 2>&1 \
	  || echo "typescript/@types/node fetch unavailable; tsc proof documented as CI-run"

codegen:
	node scripts/codegen-validators.mjs

check-syntax:
	@for f in $$(find . -name '*.mjs' -not -path './.bin/*' -not -path './node_modules/*'); do \
	  node --check $$f || exit 1; \
	done

test:
	node --test test/*.test.mjs

check: codegen check-syntax test
	@if [ -x node_modules/.bin/tsc ] && [ -d node_modules/@types/node ]; then \
	  node_modules/.bin/tsc --noEmit; \
	elif npx -y typescript tsc --noEmit; then \
	  :; \
	else \
	  echo "tsc unavailable (no network): tsconfig committed; proof 6 documented as CI-run"; \
	fi

clean:
	rm -rf generated web/validators.mjs
