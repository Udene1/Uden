FROM docker.io/cloudflare/sandbox:next-python

WORKDIR /workspace

# Uden's runtime is intentionally Python-first. Node/npm remain available in the
# base image for JavaScript/TypeScript projects.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
