---
name: inteiro-components
description: "Criar componentes e padrões de interação (botão, input, card, dashboard, dialog)."
license: MIT
metadata:
  inteiro: "1.2.0"
---

Use a biblioteca implementada antes de reconstruir um controle. Consulte inteiro_get_component no MCP ou docs/LIBRARY.md.

## Button
import { Button } from "@inteiro/react";
<Button variant="outline" size="md">Revisar</Button>

## IconButton
import { IconButton } from "@inteiro/react";
<IconButton label="Favoritar">☆</IconButton>

## TextField
import { TextField } from "@inteiro/react";
<TextField label="E-mail" type="email" error="Informe um e-mail válido." />

## Textarea
import { Textarea } from "@inteiro/react";
<Textarea label="Descrição" rows={4} />

## Select
import { Select } from "@inteiro/react";
<Select label="Ambiente" options={[{value:"prod",label:"Produção"}]} />

## MultiSelect
import { MultiSelect } from "@inteiro/react";
<MultiSelect label="Equipes" options={[{value:"design",label:"Design"}]} />

## Search
import { Search } from "@inteiro/react";
<Search label="Pesquisar" />

## Checkbox
import { Checkbox } from "@inteiro/react";
<Checkbox label="Aceito os termos" />

## Radio
import { Radio } from "@inteiro/react";
<Radio name="density" value="focus" label="Focus" />

## Switch
import { Switch } from "@inteiro/react";
<Switch label="Receber avisos" />

## DatePicker
import { DatePicker } from "@inteiro/react";
<DatePicker label="Data" min="2026-01-01" />

## TimePicker
import { TimePicker } from "@inteiro/react";
<TimePicker label="Horário" />

## Form
import { Form } from "@inteiro/react";
<Form onSubmit={save}><TextField label="Nome" required /><Button type="submit">Salvar</Button></Form>

## InlineEdit
import { InlineEdit } from "@inteiro/react";
<InlineEdit label="Nome" value={name} onSave={setName} />

## Badge
import { Badge } from "@inteiro/react";
<Badge severity="success">Concluído</Badge>

## Tag
import { Tag } from "@inteiro/react";
<Tag onRemove={remove}>Design</Tag>

## Avatar
import { Avatar } from "@inteiro/react";
<Avatar name="Luiz Borges" />

## AvatarGroup
import { AvatarGroup } from "@inteiro/react";
<AvatarGroup><Avatar name="Luiz Borges" /></AvatarGroup>

## Card
import { Card } from "@inteiro/react";
<Card title="Projeto" footer={<Button>Revisar</Button>}>Conteúdo</Card>

## CardHeader
import { CardHeader } from "@inteiro/react";
<CardHeader title="Projeto" />

## CardBody
import { CardBody } from "@inteiro/react";
<CardBody>Conteúdo</CardBody>

## CardFooter
import { CardFooter } from "@inteiro/react";
<CardFooter><Button>Revisar</Button></CardFooter>

## Panel
import { Panel } from "@inteiro/react";
<Panel title="Detalhes">Conteúdo</Panel>

## Heading
import { Heading } from "@inteiro/react";
<Heading level={2}>Detalhes</Heading>

## Text
import { Text } from "@inteiro/react";
<Text>Descrição do projeto.</Text>

## Code
import { Code } from "@inteiro/react";
<Code>npm run build</Code>

## CodeBlock
import { CodeBlock } from "@inteiro/react";
<CodeBlock>{"npm run build"}</CodeBlock>

## List
import { List } from "@inteiro/react";
<List items={["Primeiro", "Segundo"]} />

## Grid
import { Grid } from "@inteiro/react";
<Grid><Card title="Métrica">12</Card></Grid>

## Dialog
import { Dialog } from "@inteiro/react";
<Dialog open={open} onClose={() => setOpen(false)} title="Revisar"><p>Confira as alterações.</p></Dialog>

## Drawer
import { Drawer } from "@inteiro/react";
<Drawer open={open} onClose={() => setOpen(false)} title="Filtros">Conteúdo</Drawer>

## Tooltip
import { Tooltip } from "@inteiro/react";
<Tooltip text="Contexto adicional">Ajuda</Tooltip>

## Popover
import { Popover } from "@inteiro/react";
<Popover label="Filtros">Opções</Popover>

## Alert
import { Alert } from "@inteiro/react";
<Alert title="Não foi possível salvar" severity="danger">Verifique a conexão.</Alert>

## Banner
import { Banner } from "@inteiro/react";
<Banner title="Manutenção programada" />

## Toast
import { Toast } from "@inteiro/react";
<Toast title="Alterações salvas" severity="success" />

## Progress
import { Progress } from "@inteiro/react";
<Progress label="Upload" value={40} />

## Spinner
import { Spinner } from "@inteiro/react";
<Spinner label="Carregando dados" />

## Skeleton
import { Skeleton } from "@inteiro/react";
<Skeleton />

## Navigation
import { Navigation } from "@inteiro/react";
<Navigation items={[{href:"/",label:"Início",current:true}]} />

## SideNav
import { SideNav } from "@inteiro/react";
<SideNav items={[{href:"/",label:"Início"}]} />

## Breadcrumbs
import { Breadcrumbs } from "@inteiro/react";
<Breadcrumbs items={[{href:"/",label:"Início"}]} />

## Tabs
import { Tabs } from "@inteiro/react";
<Tabs label="Projeto" items={[{id:"overview",label:"Visão geral",content:<p>Resumo</p>}]} />

## Pagination
import { Pagination } from "@inteiro/react";
<Pagination page={1} pageCount={4} onPageChange={setPage} />

## DataTable
import { DataTable } from "@inteiro/react";
<DataTable caption="Projetos" rows={[{id:"1",name:"Inteiro"}]} rowKey="id" columns={[{key:"name",label:"Nome"}]} />

## Chart
import { Chart } from "@inteiro/react";
<Chart title="Entregas" kind="bar" data={[{label:"Outubro",value:12}]} />

## PageTemplate
import { PageTemplate } from "@inteiro/react";
<PageTemplate title="Projeto"><Card>Conteúdo</Card></PageTemplate>

## AppShell
import { AppShell } from "@inteiro/react";
<AppShell title="Inteiro" navigation={[{href:"/",label:"Início"}]}><h1>Projeto</h1></AppShell>

## LoginTemplate
import { LoginTemplate } from "@inteiro/react";
<LoginTemplate onSubmit={authenticate} />

## DashboardTemplate
import { DashboardTemplate } from "@inteiro/react";
<DashboardTemplate title="Operação" metrics={[{label:"Entregas",value:"12"}]} data={[{label:"Hoje",value:12}]} />

## MasterDetailTemplate
import { MasterDetailTemplate } from "@inteiro/react";
<MasterDetailTemplate title="Projetos" list={<List items={["Inteiro"]} />} detail={<Card>Detalhes</Card>} />

## SettingsTemplate
import { SettingsTemplate } from "@inteiro/react";
<SettingsTemplate><Switch label="Avisos" /></SettingsTemplate>

## DataTemplate
import { DataTemplate } from "@inteiro/react";
<DataTemplate rows={[{id:"1",name:"Inteiro",status:"Ativo"}]} />

## EmptyState
import { EmptyState } from "@inteiro/react";
<EmptyState description="Crie o primeiro projeto." />

## ErrorTemplate
import { ErrorTemplate } from "@inteiro/react";
<ErrorTemplate code="404" />

## Botão primary
Ação deliberada principal do contexto (salvar rascunho, revisar, editar).
Bom: [ Salvar rascunho ] primary   [ Publicar ] commit
Ruim: [ Cancelar ] [ Continuar ] [ Confirmar ] [ Salvar ] — quatro violet

## Botão commit
A ação sai do sistema para o mundo: publicar, deploy, aplicar.
Bom: [ Deploy ▸ ] commit
Ruim: Gráfico inteiro laranja “porque é marca”

## Botão danger
Ação destrutiva. Excluir, romper.
Bom: Excluir “projeto-x”? Remove também os três ambientes. [Cancelar] [Excluir projeto]
Ruim: Are you sure?

## Botão secondary
Ação relevante concorrente, não a deliberação principal.
Bom: [ Revisar mudanças ] secondary ao lado de [ Deploy ] commit
Ruim: Secondary filled violet

## Botão ghost
Ação contextual.
Bom: ghost em toolbar
Ruim: ghost com gradient

## Botão quiet
Baixa prioridade.
Bom: quiet “ver histórico”
Ruim: quiet com laranja

## Campo de formulário
Qualquer entrada de dado.
Bom: Informe um endereço completo, como nome@dominio.com
Ruim: borda vermelha e só

## Card neutro
Agrupar conteúdo sem interpretação especial.
Bom: surface + hairline + radius.lg
Ruim: glassmorphism + glow violet

## Card reflexivo
Reflexão editorial ou informação que muda interpretação.
Bom: data-kind=reflection
Ruim: Costura em cada card do dashboard

## Card de decisão
O bloco pede atravessar o limite.
Bom: data-kind=commit + botão commit
Ruim: Costura laranja decorativa

## Badge
Metadado descritivo, não acionável.
Bom: badge “PROD”
Ruim: badge clicável sem role de botão

## Dashboard
Visão operacional densa.
Bom: Sistema estável / As últimas 24h não mostram degradação relevante.
Ruim: Todos os KPI cards com Costura e laranja

## Editorial
Texto longo, reflexão, abertura.
Bom: max-inline-size: 70ch
Ruim: Inter no editorial e Recursive só no código

## Dialog / modal
Interromper para uma decisão.
Bom: modal elevation 3 + scrim 0.72
Ruim: modal sem scrim e sem trap de foco

## Tabela
Dados tabulares.
Bom: row 40px em focus, seleção com selection.background
Ruim: tabela com radius.full e hover glow

## Navegação
Orientar o produto.
Bom: nav sticky + item ativo violet
Ruim: nav glassmorphism neon

## Estrutura de aplicação
Portal autenticado com várias áreas, tarefas recorrentes e conteúdo operacional.
Bom: Shell estável + navegação contextual + área de trabalho com largura legível
Ruim: Cada rota inventa sua própria largura, cabeçalho, raio e escala de espaçamento

## Navegação mobile de aplicação
O shell precisa continuar orientando tarefas em telas estreitas.
Bom: Barra inferior curta, destinos rotulados e conteúdo com espaço reservado
Ruim: Sidebar desktop espremida, ícones sem nome e botões menores para caber

## Perfil e preferências
A pessoa consulta identidade, dados da conta, segurança ou preferências.
Bom: Dados atuais legíveis + edição explícita + feedback junto à seção alterada
Ruim: Campos sem rótulo, ações desalinhadas e status indicado só por cor

## Fluxo por etapas
Uma tarefa longa exige decisões em sequência, como enviar conteúdo para revisão.
Bom: Etapa atual legível, resumo preservado e erro com instrução de correção
Ruim: Cinco rótulos comprimidos, navegação ambígua e dados apagados ao voltar

## Feedback de erro
Algo falhou.
Bom: Não foi possível salvar. A conexão foi interrompida antes da confirmação. Tentar novamente
Ruim: Oops! Algo deu errado 😅

## Feedback de sucesso
Resolução real.
Bom: Deploy concluído  production · 2f41c9a · agora
Ruim: Success! 🎉

## Estado vazio
Ainda não há dados.
Bom: Nenhum ambiente ainda. Criar o primeiro ambiente.
Ruim: Nada por aqui... ✨

## Loading e skeleton
Espera previsível.
Bom: skeleton surface + subtle identity
Ruim: spinner neon bounce infinito

## Foco visível
Sempre que houver controle.
Bom: outline: 2px solid var(--in-color-focus-ring); outline-offset: 2px;
Ruim: outline: none;
