# /health Endpoint Contract

## Current dev1 Response

```json
{
  "status": "ok",
  "service": "lmc-api",
  "runtime_marker": "local-image-proof-20260428",
  "environment": {"name": "dev1"},
  "version": {
    "VERSION_SOURCE": "ci",
    "VERSION_GIT_SHA": "34eda081beceaf8cace3050127ea03a7aeb0250c",
    "VERSION_GIT_SHORT_SHA": "34eda08",
    "VERSION_GIT_BRANCH": "master",
    "VERSION_GIT_DESCRIBE": "34eda08",
    "VERSION_GIT_TAGS": "",
    "VERSION_BUILD_TIMESTAMP": "2026-05-06T09:40:46Z",
    "VERSION_BUILD_WORKFLOW": "Pricing Engine - Deploy",
    "VERSION_BUILD_RUN_ID": "25427657070",
    "VERSION_IMAGE_TAG": "34eda081beceaf8cace3050127ea03a7aeb0250c"
  }
}
```

## Minimum server.py

```python
# Copyright (c) 2026 LiveMore Capital www.livemorecapital.com
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI

app = FastAPI()

_VERSION_KEYS = (
    "VERSION_SOURCE",
    "VERSION_GIT_SHA",
    "VERSION_GIT_SHORT_SHA",
    "VERSION_GIT_BRANCH",
    "VERSION_GIT_DESCRIBE",
    "VERSION_GIT_TAGS",
    "VERSION_BUILD_TIMESTAMP",
    "VERSION_BUILD_WORKFLOW",
    "VERSION_BUILD_RUN_ID",
    "VERSION_IMAGE_TAG",
)


def _load_version() -> dict[str, str]:
    props = Path(os.environ.get("APP_ROOT", ".")) / "version.properties"
    if not props.is_file():
        return {}
    result: dict[str, str] = {}
    for line in props.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, _, v = line.partition("=")
            k = k.strip()
            if k in _VERSION_KEYS:
                result[k] = v.strip()
    return result


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "service": "lmc-api",
        "environment": {"name": os.environ.get("LMC_ENVIRONMENT", "local")},
        "version": _load_version(),
    }
```

## Notes

- `version.properties` is written by CI at build time. Missing file → empty version dict.
- `runtime_marker` was a one-off image proof tag; omitted from the clean implementation.
- `LMC_ENVIRONMENT` env var drives the environment name. Defaults to `"local"`.
- No DB connection needed. No nulls in the response — empty dict when no version file.
