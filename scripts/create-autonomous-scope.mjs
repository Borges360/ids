import { readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";

// Migration aid: creates a pending matrix, never an acceptance record.
for (const path of [
  "docs/P0_AUTONOMOUS_MATRIX.json",
  "docs/P0_AUTONOMOUS_SCOPE.md",
]) {
  let exists = false;
  try {
    await access(path);
    exists = true;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (exists)
    throw Error("Refusing to overwrite an existing autonomous scope: " + path);
}
const original = await readFile("docs/INTEIRO_ESPECIFICACAO_P0.md");
const spec = original.toString("utf8");
const ledger = JSON.parse(await readFile("release-evidence.json", "utf8"));
const excluded = [
  "Deploy Jenkins",
  "Comparação real entre modelos",
  "Smoke com agentes reais",
  "Aprovação humana final da meta",
  "Julgamento estético humano",
  "Calibração com corpus humano",
];
const substitutions = {
  E05: "Promoção técnica por executor separado, intenção visual prévia, checks e cadeia auditável; sem autoaprovação do implementador.",
  E08: "Somente revisão técnica objetiva; preservar rubrica humana opcional e identificar avaliação sintética.",
  E09: "Preparação/validação das 40 tarefas e métricas observadas; comparação entre modelos e agentes reais excluídas.",
  "WP-15": "Promoção técnica protegida substitui assinatura humana.",
  "WP-19":
    "Revisão técnica objetiva substitui requisito humano/multimodal obrigatório.",
  "WP-20":
    "Contratos públicos, grading privado e execução determinística; sem experimento real.",
  "DoD-01":
    "Auditoria automática das 58 linhas substitui assinatura do mantenedor.",
  "DoD-06":
    "Implementador não pode promover referências; executor técnico separado e auditável.",
  "DoD-09":
    "Custo desconhecido permanece null; sem benefício atribuído a experimento excluído.",
  "SCN-03":
    "Baseline ausente bloqueia; criação inicial somente após checks independentes.",
  "SCN-04":
    "Intenção prévia e promoção técnica verificável substituem revisor humano.",
  "SCN-11":
    "Julgamento estético excluído; checks objetivos continuam obrigatórios.",
};
const rows = ledger.requirements.map((row) => {
  const escaped = row.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const title =
    spec.match(new RegExp("\\| " + escaped + " \\| ([^|\\n]+)"))?.[1]?.trim() ??
    spec.match(new RegExp("\\*\\*" + escaped + " — ([^*]+)"))?.[1]?.trim() ??
    row.id;
  const implementation = row.evidence
    .map((e) => e.path)
    .filter((p) => !p.startsWith("artifacts/"));
  const tests = implementation.filter((p) =>
    /^tests\/p0\/.*\.test\.ts$/.test(p),
  );
  return {
    id: row.id,
    title,
    applicability: substitutions[row.id]
      ? "technical-substitution"
      : "mandatory",
    scope:
      substitutions[row.id] ??
      "Requisito técnico original integralmente aplicável.",
    implementation,
    remaining:
      "Auditar cobertura e implementar lacunas; reexecutar na versão final congelada.",
    requiredEvidence:
      "Resultado estruturado da verificação, código de saída, sourceHash, policyHash e hashes dos artefatos.",
    verification: tests.length
      ? ["npx vitest run " + tests.join(" ")]
      : ["npm run verify:p0"],
    status: "not_run",
    evidence: [],
  };
});
const matrix = {
  schemaVersion: "1.0",
  mode: "technical-autonomous",
  historicalSpecification: {
    path: "docs/INTEIRO_ESPECIFICACAO_P0.md",
    sha256: createHash("sha256").update(original).digest("hex"),
  },
  exclusions: excluded,
  requirements: rows,
};
await writeFile(
  "docs/P0_AUTONOMOUS_MATRIX.json",
  JSON.stringify(matrix, null, 2) + "\n",
);
await writeFile(
  "docs/P0_AUTONOMOUS_SCOPE.md",
  `# Escopo técnico autônomo P0\n\nA especificação original permanece integralmente preservada como documento histórico (SHA-256: \`${matrix.historicalSpecification.sha256}\`). Este adendo formaliza o escopo autorizado pelo solicitante. Não declara conclusão da implementação.\n\nA matriz canônica é [P0_AUTONOMOUS_MATRIX.json](P0_AUTONOMOUS_MATRIX.json): contém as 58 linhas E00–E10, WP-01–23, DoD-01–12 e SCN-01–12, implementação conhecida, trabalho restante, evidência e comando. Linhas pendentes continuam pendentes até comprovação na mesma versão. Exclusões não são requisitos aprovados.\n\n## Exclusões expressas\n\n${excluded.map((x) => "- " + x).join("\n")}\n\n## Substituições obrigatórias\n\n| Item | Contrato autônomo |\n|---|---|\n${Object.entries(
    substitutions,
  )
    .map(([id, text]) => "| " + id + " | " + text + " |")
    .join(
      "\n",
    )}\n\n## Condições técnicas\n\nGovernança \`human-approval\` permanece compatível. Governança \`technical-autonomous\` exige contrato versionado com hash em evidências, gates completos, fonte imutável durante a qualificação, promoção de referências separada do implementador e verificação de integridade. Nenhuma dispensa humana remove checks técnicos.\n\nCaptura, validação e promoção são eventos distintos. Atestação automática deve usar essa identificação; não representa assinatura humana. Diferença inesperada bloqueia e segue reparo limitado. Mudança deliberada exige intenção visual anterior vinculada a contrato e predecessor. Critérios privados de grading e referências protegidas ficam fora do candidato.\n\nFalhas geram diagnósticos estruturados. Há no máximo duas correções automáticas após a execução inicial; repetição de falha encerra a tentativa. Infraestrutura indisponível permanece erro, nunca sucesso sintético.\n\n## Auditoria de encerramento\n\nTodos os requisitos obrigatórios devem ter evidências atuais, incluindo navegador real, canários, acessibilidade automatizada, compatibilidade histórica, pacotes e instalação offline Windows/Linux. Resultados reais, sintéticos e indisponíveis permanecem distintos. Nenhuma aprovação humana é condição de encerramento neste escopo. A meta só termina após auditoria automática de todas as linhas; até lá seu estado é incompleto.\n`,
);
