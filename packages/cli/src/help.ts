export const HELP = `INTEIRO — Identity Design System CLI

Uso:
  inteiro <comando> [opções]

Contratos e gates P0:
  contract inspect --json
  context verify|resolve --harness <id> --json
  context plan --task <texto> --files <paths> --patterns <ids> --acceptance <texto> [--record]
  context resolve --record --json
  context verify --task-context --json
  compose list|show|find|validate|propose <id>
  lint [path] --format json|sarif|stylish [--changed] [--strict]
  lint [path] --fix-dry-run [--mapping <policy.json>]
  lint [path] --fix [--mapping <policy.json> --plan-hash <preview-hash>]
  visual test --json [--start]
  visual baseline propose|approve --review-id <id> --approval <file>
  review request --run-id <id>
  repair context --run-id <id>
  gate run --profile dev|pr|ci|main|nightly|release --json
  benchmark run --suite p0-smoke --json
  benchmark run --observations <file> [--protocol <file>] [--dry-run] --json
  benchmark run --calibration <file> [--dry-run] --json
  benchmark grade --grading <file> --candidate <git-root> [--dry-run] --json
  benchmark prepare --case <id> --target <new-dir> [--dry-run] --json
  benchmark prepare --case <id> --target <new-dir> --bootstrap --packages-manifest <file> --dependency-lock <file> --harness pi|codex --json
  benchmark worker-audit --worker <receipt-id> --json
  report export --out <archive.json> [--summary <summary.json>] --json
  report extract --archive <archive.json> --out <new-directory> --json
  report verify --directory <extracted-directory> --json
  report prune [--apply] --json
  doctor --deep --json

Comandos:
  init                         Detecta o projeto e configura a integração
  doctor                       Diagnóstico de tokens, temas e adaptadores

  tokens list                  Lista tokens (opções: --layer --category --json)
  tokens search <query>        Busca semântica no catálogo
  tokens explain <name>        Explica um token
  tokens build                 Gera CSS, JSON, TS, SCSS e plataformas
  tokens validate              Valida aliases, tipos, ciclos e contraste
  tokens export                Exporta --format css|json|ts|scss|tailwind|flutter|swift

  themes list                  Lista temas
  themes inspect <name>        Inspeciona um tema (dark|light|contrast-dark|contrast-light)

  skills list                  Lista skills canônicas e geradas
  skills generate              Gera SKILL.md por token
  skills explain <name>        Explica uma skill

  agents list                  Lista harnesses e mecanismos reais
  agents install <harness|all> Instala adaptador (codex|claude|devin|cursor|pi|hermes)
    --context-only             Codex: registra AGENTS e skills sem substituir plugin/MCP existente
  agents uninstall <harness>   Remove arquivos gerenciados
  agents doctor                Diagnóstico de instalação

  audit [path]                 Auditoria de conformidade (hex, a11y, RTL)
  migrate [path]               Preview de migração e checksums; preserva casos ambíguos
    --mapping <policy.json> --dry-run
    --mapping <policy.json> --yes --plan-hash <hash>

Opções globais:
  --help, -h                   Ajuda
  --json                       Saída JSON
  --dry-run                    Não escreve arquivos
  --yes, -y                    Confirma gravações gerenciadas; init preserva CSS existente
  --format <fmt>               Formato de exportação
  --theme <name>               Tema
  --layer <layer>              primitive|semantic|component
  --category <name>            Filtro de categoria
  --out <path>                 Destino
  --cwd <path>                 Diretório do projeto

Códigos de saída:
  0 ok | 2 uso | 3 não encontrado | 4 inválido | 5 IO
  6 qualidade reprovada | 7 bloqueio/revisão pendente | 8 infraestrutura
`;
