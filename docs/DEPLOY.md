# Deploy Jenkins

O ambiente local possui o MCP Jenkins em `mcphub/servers/jenkins/index.mjs`. Ferramentas relevantes: `jenkins_job`, `jenkins_pipeline`, `jenkins_build`, `jenkins_build_status` e `jenkins_console`. O catálogo existente indica `ids-dev`, em `http://ids.lab/`.

O job `ids-dev` aceita BRANCH, SKIP_TEST e DRY_RUN. Para esta entrega, usar a branch `codex/inteiro-expansion`, SKIP_TEST=false e DRY_RUN=false somente após enviar o commit validado ao remoto. `confirm=true` confirma a ação já autorizada pelo solicitante. Consultar o build específico até SUCCESS e validar a versão publicada. Não declarar deploy concluído apenas porque o disparo foi aceito.

O Jenkinsfile neste repositório adapta a esteira K3s existente do ids-dev e mantém os parâmetros BRANCH, SKIP_TEST e DRY_RUN. Ele executa a verificação completa e os testes de navegador, constrói `deploy/Dockerfile`, publica no registry interno e verifica rollout e health em `http://ids.lab/`. O controller deve usar esse Jenkinsfile do checkout ou receber o conteúdo atualizado pela configuração de pipelines. A configuração atual aponta para o arquivo antigo do catálogo externo.

`npm run build:site` produz uma distribuição estática com Storybook em `/storybook/`, documentação, tokens e `release.json`. O servidor Node de demonstração atende `/storybook/` após o build. O pacote React tem ESM e declarações, sem incluir React no bundle.

O Dockerfile canônico da entrega é `deploy/Dockerfile`: constrói biblioteca, tokens, interoperabilidade, docs e Storybook. A configuração antiga do job ids-dev usa `platform/ids-dockerfile`, que constrói apenas tokens e não copia o Storybook. O novo Jenkinsfile usa o Dockerfile do checkout. Isso precisa acompanhar a implantação; disparar o job antigo sem essa adaptação publica documentação sem o Storybook.

## MCP do INTEIRO no cluster

A imagem do `ids` também carrega o servidor MCP por HTTP (`/app/inteiro-mcp`, empacotado por `scripts/build-mcp-runtime.mjs`). O Deployment `inteiro-mcp` (namespace dev, repositório jenkies) usa essa mesma imagem com o comando `node inteiro-mcp/dist/inteiro-mcp.mjs`, e o MCPHub o acessa por URL interna. O `ids-dev` troca a imagem dos dois Deployments pelo mesmo digest e só conclui se o `/health` do MCP devolver a versão do `package.json` buildado. Por isso não existe cópia nem atualização manual do MCP: publicou o IDS, o MCP acompanha. Antes de publicar, `npm run test:mcp-runtime` prova o pacote isolado do monorepo (também roda no `npm run ci`).

Se a API retornar 401, renovar a credencial Jenkins na configuração segura do MCP. Não registrar token no repositório ou na saída de terminal. HTTP 401 bloqueia tanto a consulta ao estado atual como o deploy verificável.
