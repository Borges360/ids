# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
COPY packages packages
COPY apps apps
COPY scripts scripts
COPY docs docs
COPY .storybook .storybook
COPY stories stories
COPY tsconfig.json ./
RUN npm ci --no-audit --no-fund
RUN npm run build && npm run build:platforms && npm run build:docs && npm run build:storybook
RUN npm exec --offline -- esbuild scripts/serve-demo.mjs --bundle --platform=node --format=esm --outfile=runtime/scripts/serve-demo.mjs

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173
COPY --from=build /src/runtime/scripts/serve-demo.mjs ./scripts/serve-demo.mjs
COPY --from=build /src/apps/demo ./apps/demo
COPY --from=build /src/apps/catalog ./apps/catalog
COPY --from=build /src/docs ./docs
COPY --from=build /src/packages/tokens/dist ./packages/tokens/dist
COPY --from=build /src/packages/design-system/src/components.css ./packages/design-system/src/components.css
COPY --from=build /src/packages/composition ./packages/composition
COPY --from=build /src/storybook-static ./storybook-static
USER node
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:4173/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/serve-demo.mjs"]
