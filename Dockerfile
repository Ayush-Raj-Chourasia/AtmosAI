# =============================================================================
# N-WEIS: National Weather Event Intelligence System
# Standalone Server Container (SIH 2026 - Problem Statement SIH26069)
# Target: Ministry of Earth Sciences / India Meteorological Department (IMD)
# =============================================================================

FROM node:20-alpine

# OCI & System Labels
LABEL title="N-WEIS" \
      description="National Weather Event Intelligence System - AI-Powered Weather Intelligence Platform for MoES / IMD" \
      version="1.0.0" \
      sih.edition="SIH 2026" \
      sih.problem_statement="SIH26069" \
      org.opencontainers.image.title="N-WEIS" \
      org.opencontainers.image.description="National Weather Event Intelligence System (SIH26069)" \
      org.opencontainers.image.vendor="Ministry of Earth Sciences / India Meteorological Department (IMD)" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.authors="Team N-WEIS"

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001

# Set working directory
WORKDIR /app

# Configure permissions for the pre-existing non-root 'node' user
RUN chown -R node:node /app

# Copy server, connectors, database layer, and web dashboard assets
COPY --chown=node:node package.json ./
COPY --chown=node:node server-nweis.mjs ./
COPY --chown=node:node database/ ./database/
COPY --chown=node:node connectors/ ./connectors/
COPY --chown=node:node data/ ./data/
COPY --chown=node:node apps/api/src/database/schema.sql ./apps/api/src/database/schema.sql
COPY --chown=node:node public/ ./public/

# Switch to non-root user for security hardening
USER node

# Expose server port
EXPOSE 3001

# Health check using busybox wget against the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --spider http://localhost:3001/health || exit 1

# Start the standalone server
CMD ["node", "server-nweis.mjs"]
