# Escopo técnico autônomo P0

A especificação original permanece integralmente preservada como documento histórico (SHA-256: `e73f1ff32e92e6cc412226e9afe56f18c7ba8768bbfa8f25230e13094b1dccd9`). Este adendo formaliza o escopo autorizado pelo solicitante. Não declara conclusão da implementação.

A matriz canônica é [P0_AUTONOMOUS_MATRIX.json](P0_AUTONOMOUS_MATRIX.json): contém as 58 linhas E00–E10, WP-01–23, DoD-01–12 e SCN-01–12, implementação conhecida, trabalho restante, evidência e comando. Linhas pendentes continuam pendentes até comprovação na mesma versão. Exclusões não são requisitos aprovados.

## Exclusões expressas

- Deploy Jenkins
- Comparação real entre modelos
- Smoke com agentes reais
- Aprovação humana final da meta
- Julgamento estético humano
- Calibração com corpus humano

## Substituições obrigatórias

| Item | Contrato autônomo |
|---|---|
| E05 | Promoção técnica por executor separado, intenção visual prévia, checks e cadeia auditável; sem autoaprovação do implementador. |
| E08 | Somente revisão técnica objetiva; preservar rubrica humana opcional e identificar avaliação sintética. |
| E09 | Preparação/validação das 40 tarefas e métricas observadas; comparação entre modelos e agentes reais excluídas. |
| WP-15 | Promoção técnica protegida substitui assinatura humana. |
| WP-19 | Revisão técnica objetiva substitui requisito humano/multimodal obrigatório. |
| WP-20 | Contratos públicos, grading privado e execução determinística; sem experimento real. |
| DoD-01 | Auditoria automática das 58 linhas substitui assinatura do mantenedor. |
| DoD-06 | Implementador não pode promover referências; executor técnico separado e auditável. |
| DoD-09 | Custo desconhecido permanece null; sem benefício atribuído a experimento excluído. |
| SCN-03 | Baseline ausente bloqueia; criação inicial somente após checks independentes. |
| SCN-04 | Intenção prévia e promoção técnica verificável substituem revisor humano. |
| SCN-11 | Julgamento estético excluído; checks objetivos continuam obrigatórios. |

## Condições técnicas

Governança `human-approval` permanece compatível. Governança `technical-autonomous` exige contrato versionado com hash em evidências, gates completos, fonte imutável durante a qualificação, promoção de referências separada do implementador e verificação de integridade. Nenhuma dispensa humana remove checks técnicos.

Captura, validação e promoção são eventos distintos. Atestação automática deve usar essa identificação; não representa assinatura humana. Diferença inesperada bloqueia e segue reparo limitado. Mudança deliberada exige intenção visual anterior vinculada a contrato e predecessor. Critérios privados de grading e referências protegidas ficam fora do candidato.

Falhas geram diagnósticos estruturados. Há no máximo duas correções automáticas após a execução inicial; repetição de falha encerra a tentativa. Infraestrutura indisponível permanece erro, nunca sucesso sintético.

## Auditoria de encerramento

Todos os requisitos obrigatórios devem ter evidências atuais, incluindo navegador real, canários, acessibilidade automatizada, compatibilidade histórica, pacotes e instalação offline Windows/Linux. Resultados reais, sintéticos e indisponíveis permanecem distintos. Nenhuma aprovação humana é condição de encerramento neste escopo. A meta só termina após auditoria automática de todas as linhas; até lá seu estado é incompleto.

O hash de fontes inclui o contrato substantivo da matriz. Somente os campos de progresso `status`, `evidence`, `qualification` e `remaining` de cada requisito ficam fora desse hash para evitar circularidade ao registrar o resultado final. Isso não autoriza aceite: o gate de release exige, para cada requisito, recibos assinados e saídas verificáveis vinculados à mesma fonte. Alterar requisito, aplicabilidade, evidência exigida ou comando de verificação muda o hash e invalida a qualificação anterior.
