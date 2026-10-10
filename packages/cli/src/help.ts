export const HELP = `INTEIRO — Identity Design System CLI

Uso:
  inteiro <comando> [opções]

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
  agents uninstall <harness>   Remove arquivos gerenciados
  agents doctor                Diagnóstico de instalação

  audit [path]                 Auditoria de conformidade (hex, a11y, RTL)
  migrate [path]               Sugere migração de hex/legado para tokens

Opções globais:
  --help, -h                   Ajuda
  --json                       Saída JSON
  --dry-run                    Não escreve arquivos
  --yes, -y                    Não interativo; permite overwrite
  --format <fmt>               Formato de exportação
  --theme <name>               Tema
  --layer <layer>              primitive|semantic|component
  --category <name>            Filtro de categoria
  --out <path>                 Destino
  --cwd <path>                 Diretório do projeto

Códigos de saída:
  0 ok | 2 uso | 3 não encontrado | 4 inválido | 5 IO
`;
