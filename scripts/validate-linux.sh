#!/usr/bin/env bash
set -eu
export CI=true NEXT_TELEMETRY_DISABLED=1 STORYBOOK_DISABLE_TELEMETRY=1
node --input-type=module <<'NODE'
import {cp} from 'node:fs/promises';
import {relative} from 'node:path';
const excluded=new Set(['node_modules','artifacts','.git','.codex','.cursor','.pi','.agents','.mcp.json','.next','dist','storybook-static','playwright-report','test-results','out']);
await cp('/source','/work',{recursive:true,filter:path=>{const rel=relative('/source',path);return !rel.startsWith('.inteiro/reports')&&(!rel.startsWith('.inteiro/reviews/')||rel==='.inteiro/reviews/decision.json')&&!rel.split('/').some(part=>excluded.has(part)||part.startsWith('.env'));}});
NODE
cd /work
apt-get update
apt-get install -y --no-install-recommends git ca-certificates
export INTEIRO_COMPAT_GIT_ROOT=/source
git init -b codex/validation-snapshot
git add -- package.json package-lock.json packages tests scripts docs apps examples .storybook stories inteiro.config.json inteiro.routes.json .inteiro/task.json
git -c user.name='Synthetic Linux validation' -c user.email='validation@example.invalid' commit -m 'Local validation snapshot; not a product commit'
npm ci --no-audit --no-fund
npm run ci
npx playwright install --with-deps chromium
npm run test:browser-gate
npm run test:stories
INTEIRO_FULL_MATRIX=1 npm run test:browser -- --workers=4 --fully-parallel
npm run measure:p0
npm run pack:p0
npm run smoke:offline -- --seed-cache
npm sbom --sbom-format cyclonedx > /work/artifacts/p0-sbom.json
if [ -d /evidence ]; then
  cp /work/artifacts/p0-sbom.json /work/artifacts/p0-offline.json /work/artifacts/p0-performance.json /evidence/
  tar -C /work -czf /evidence/p0-linux-artifacts.tgz artifacts/p0-patterns artifacts/screenshots playwright-report
fi
echo 'LINUX_VALIDATION_PASSED'
