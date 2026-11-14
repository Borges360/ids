// One implementation plan feeds the 58-row matrix; it is not an acceptance ledger.
export const epicPlan = {
  E00: {implementation:['packages/contracts/src/governance.ts','packages/contracts/src/attestation.ts','packages/contracts/src/policy.ts'],remaining:'Qualificar os schemas e os consumidores instalados na mesma versão; concluir isolamento operacional do atestador técnico.'},
  E01: {implementation:['packages/agent-core/src/context.ts','packages/agent-core/src/task-context.ts'],remaining:'Atualizar o plano/recibo para o escopo final e validar CLI/MCP instalados em Windows e Linux; leitura interna de modelos permanece não observada.'},
  E02: {implementation:['packages/composition/src/render.ts','packages/composition/src/behavior.js','tests/browser/composition-robustness.spec.ts'],remaining:'Consolidar cobertura dos 41 padrões por dimensão, executar matriz completa e fixtures HTML/React/Next/Vue/Svelte.'},
  E03: {implementation:['packages/lint/src/index.ts'],remaining:'Reexecutar corpus positivo/negativo e controles de exceção/autofix sobre a distribuição final.'},
  E04: {implementation:['packages/visual/src/index.ts','packages/visual/src/clipping.ts','packages/visual/src/fixture-responder.ts','tests/p0/browser-interaction.test.ts','tests/p0/browser-async-fixtures.test.ts'],remaining:'Qualificar capturas, comparação visual e canários de 10 repetições na fonte congelada; ligar as evidências à cobertura declarada.'},
  E05: {implementation:['packages/visual/src/technical-baseline.ts','tests/p0/technical-baseline.test.ts'],remaining:'Concluir executor separado com proteção de filesystem, emitir atestações técnicas reais e testar reversão da cadeia; os testes existentes usam apenas chaves sintéticas.'},
  E06: {implementation:['scripts/generate-pattern-stories.mjs','packages/composition/story-matrix.json'],remaining:'Vincular casos vazios/negativos/zoom nativo às 41 entradas e reexecutar stories e catálogo da distribuição final.'},
  E07: {implementation:['packages/agent-core/src/repair-controller.ts','packages/agent-core/src/repair-validation.ts'],remaining:'Validar reparo autônomo instalado, limites cumulativos e proteção de políticas/atestadores/contratos com casos negativos.'},
  E08: {implementation:['packages/agent-core/src/review.ts','tests/p0/autonomous-governance.test.ts'],remaining:'Qualificar revisão técnica com evidências reais da versão final; não criar notas de julgamento estético nem alegar calibração humana.'},
  E09: {implementation:['benchmarks/validation','scripts/generate-public-validation.mjs','tests/p0/public-validation.test.ts'],remaining:'Completar estados/dimensões aplicáveis dos 40 contratos; qualificar bootstrap offline, controles válidos, starters e mutações sem agentes reais.'},
  E10: {implementation:['scripts/verify-p0.mjs','scripts/pack-p0.mjs','scripts/smoke-offline.mjs'],remaining:'Concluir perfis com análise de impacto, execução release, pacote portátil, retenção/SBOM/vulnerabilidades e integração Windows/Linux/checkout limpo.'},
};
export const workEpic = {
  'WP-01':'E00','WP-02':'E00','WP-03':'E00','WP-04':'E01','WP-05':'E01',
  'WP-06':'E02','WP-07':'E02','WP-08':'E02','WP-09':'E02','WP-10':'E03','WP-11':'E03',
  'WP-12':'E04','WP-13':'E04','WP-14':'E04','WP-15':'E05','WP-16':'E06','WP-17':'E10',
  'WP-18':'E07','WP-19':'E08','WP-20':'E09','WP-21':'E10','WP-22':'E10','WP-23':'E10',
  'DoD-01':'E10','DoD-02':'E10','DoD-03':'E02','DoD-04':'E10','DoD-05':'E03','DoD-06':'E05',
  'DoD-07':'E04','DoD-08':'E00','DoD-09':'E09','DoD-10':'E10','DoD-11':'E06','DoD-12':'E10',
  'SCN-01':'E03','SCN-02':'E04','SCN-03':'E05','SCN-04':'E05','SCN-05':'E01','SCN-06':'E04',
  'SCN-07':'E07','SCN-08':'E08','SCN-09':'E02','SCN-10':'E00','SCN-11':'E08','SCN-12':'E04',
};
