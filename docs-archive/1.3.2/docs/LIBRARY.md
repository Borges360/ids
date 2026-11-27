# Biblioteca React e templates

Instale `@inteiro/react` e importe `@inteiro/tokens/css` e `@inteiro/design-system/css/components`. Envolva a aplicação em `InteiroProvider`. Componentes usam elementos nativos, CSS lógico, quatro temas e duas densidades.

`DatePicker` e `TimePicker` usam seletores nativos do navegador; o calendário e as interações variam por plataforma. `MultiSelect` usa select múltiplo nativo. Labels e conteúdos são props traduzíveis.

A API completa de props usa atributos HTML nativos e os tipos publicados em `@inteiro/react`. Execute `npm run storybook` para controles, variantes e exemplos interativos.

## Button

Categoria: actions.

```tsx
import { Button } from "@inteiro/react";
<Button variant="outline" size="md">Revisar</Button>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| variant | não | `"text" \| "primary" \| "commit" \| "danger" \| "secondary" \| "ghost" \| "quiet" \| "solid" \| "outline" \| undefined` |
| size | não | `"sm" \| "md" \| "lg" \| undefined` |
| loading | não | `boolean \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## IconButton

Categoria: actions.

```tsx
import { IconButton } from "@inteiro/react";
<IconButton label="Favoritar">☆</IconButton>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| variant | não | `"text" \| "primary" \| "commit" \| "danger" \| "secondary" \| "ghost" \| "quiet" \| "solid" \| "outline" \| undefined` |
| size | não | `"sm" \| "md" \| "lg" \| undefined` |
| loading | não | `boolean \| undefined` |
| label | sim | `string` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## TextField

Categoria: forms.

```tsx
import { TextField } from "@inteiro/react";
<TextField label="E-mail" type="email" error="Informe um e-mail válido." />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | sim | `string` |
| error | não | `string \| undefined` |
| helpText | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Textarea

Categoria: forms.

```tsx
import { Textarea } from "@inteiro/react";
<Textarea label="Descrição" rows={4} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | sim | `string` |
| error | não | `string \| undefined` |
| helpText | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Select

Categoria: forms.

```tsx
import { Select } from "@inteiro/react";
<Select label="Ambiente" options={[{value:"prod",label:"Produção"}]} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | sim | `string` |
| error | não | `string \| undefined` |
| helpText | não | `string \| undefined` |
| options | sim | `SelectOption[]` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## MultiSelect

Categoria: forms.

```tsx
import { MultiSelect } from "@inteiro/react";
<MultiSelect label="Equipes" options={[{value:"design",label:"Design"}]} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | sim | `string` |
| error | não | `string \| undefined` |
| helpText | não | `string \| undefined` |
| options | sim | `SelectOption[]` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Search

Categoria: forms.

```tsx
import { Search } from "@inteiro/react";
<Search label="Pesquisar" />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | sim | `string` |
| error | não | `string \| undefined` |
| helpText | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Checkbox

Categoria: forms.

```tsx
import { Checkbox } from "@inteiro/react";
<Checkbox label="Aceito os termos" />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | sim | `string` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Radio

Categoria: forms.

```tsx
import { Radio } from "@inteiro/react";
<Radio name="density" value="focus" label="Focus" />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | sim | `string` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Switch

Categoria: forms.

```tsx
import { Switch } from "@inteiro/react";
<Switch label="Receber avisos" />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | sim | `string` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## DatePicker

Categoria: forms.

```tsx
import { DatePicker } from "@inteiro/react";
<DatePicker label="Data" min="2026-01-01" />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | sim | `string` |
| error | não | `string \| undefined` |
| helpText | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## TimePicker

Categoria: forms.

```tsx
import { TimePicker } from "@inteiro/react";
<TimePicker label="Horário" />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | sim | `string` |
| error | não | `string \| undefined` |
| helpText | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Form

Categoria: forms.

```tsx
import { Form } from "@inteiro/react";
<Form onSubmit={save}><TextField label="Nome" required /><Button type="submit">Salvar</Button></Form>
```

Atributos HTML nativos do elemento correspondente.

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## InlineEdit

Categoria: forms.

```tsx
import { InlineEdit } from "@inteiro/react";
<InlineEdit label="Nome" value={name} onSave={setName} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | sim | `string` |
| value | sim | `string` |
| onSave | sim | `(value: string) => void` |
| saveLabel | não | `string \| undefined` |
| cancelLabel | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Badge

Categoria: display.

```tsx
import { Badge } from "@inteiro/react";
<Badge severity="success">Concluído</Badge>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| severity | não | `Severity \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## Tag

Categoria: display.

```tsx
import { Tag } from "@inteiro/react";
<Tag onRemove={remove}>Design</Tag>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| children | sim | `ReactNode` |
| onRemove | não | `(() => void) \| undefined` |
| removeLabel | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## Avatar

Categoria: display.

```tsx
import { Avatar } from "@inteiro/react";
<Avatar name="Luiz Borges" />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| name | sim | `string` |
| src | não | `string \| undefined` |
| size | não | `"sm" \| "md" \| "lg" \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## AvatarGroup

Categoria: display.

```tsx
import { AvatarGroup } from "@inteiro/react";
<AvatarGroup><Avatar name="Luiz Borges" /></AvatarGroup>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| children | sim | `ReactNode` |
| label | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## Card

Categoria: display.

```tsx
import { Card } from "@inteiro/react";
<Card title="Projeto" footer={<Button>Revisar</Button>}>Conteúdo</Card>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| title | não | `string \| undefined` |
| footer | não | `ReactNode` |
| image | não | `{ src: string; alt: string; } \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## CardHeader

Categoria: display.

```tsx
import { CardHeader } from "@inteiro/react";
<CardHeader title="Projeto" />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| title | sim | `string` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## CardBody

Categoria: display.

```tsx
import { CardBody } from "@inteiro/react";
<CardBody>Conteúdo</CardBody>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| children | sim | `ReactNode` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## CardFooter

Categoria: display.

```tsx
import { CardFooter } from "@inteiro/react";
<CardFooter><Button>Revisar</Button></CardFooter>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| children | sim | `ReactNode` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## Panel

Categoria: display.

```tsx
import { Panel } from "@inteiro/react";
<Panel title="Detalhes">Conteúdo</Panel>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| title | não | `string \| undefined` |
| footer | não | `ReactNode` |
| image | não | `{ src: string; alt: string; } \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## Heading

Categoria: display.

```tsx
import { Heading } from "@inteiro/react";
<Heading level={2}>Detalhes</Heading>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| level | não | `1 \| 2 \| 3 \| 4 \| 5 \| 6 \| undefined` |
| children | sim | `ReactNode` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## Text

Categoria: display.

```tsx
import { Text } from "@inteiro/react";
<Text>Descrição do projeto.</Text>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| children | sim | `ReactNode` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## Code

Categoria: display.

```tsx
import { Code } from "@inteiro/react";
<Code>npm run build</Code>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| children | sim | `ReactNode` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## CodeBlock

Categoria: display.

```tsx
import { CodeBlock } from "@inteiro/react";
<CodeBlock>{"npm run build"}</CodeBlock>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| children | sim | `string` |
| label | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## List

Categoria: display.

```tsx
import { List } from "@inteiro/react";
<List items={["Primeiro", "Segundo"]} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| items | sim | `ReactNode[]` |
| label | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## Grid

Categoria: display.

```tsx
import { Grid } from "@inteiro/react";
<Grid><Card title="Métrica">12</Card></Grid>
```

Atributos HTML nativos do elemento correspondente.

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## Dialog

Categoria: overlays.

```tsx
import { Dialog } from "@inteiro/react";
<Dialog open={open} onClose={() => setOpen(false)} title="Revisar"><p>Confira as alterações.</p></Dialog>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| open | sim | `boolean` |
| title | sim | `string` |
| children | sim | `ReactNode` |
| onClose | sim | `() => void` |
| closeLabel | não | `string \| undefined` |
| className | não | `string \| undefined` |

Dialog e Drawer usam dialog.showModal: foco contido nativo, Escape, restauração de foco. Tooltip abre em foco/hover, fecha por Escape; Popover fecha por Escape ou clique externo.

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Drawer

Categoria: overlays.

```tsx
import { Drawer } from "@inteiro/react";
<Drawer open={open} onClose={() => setOpen(false)} title="Filtros">Conteúdo</Drawer>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| open | sim | `boolean` |
| title | sim | `string` |
| children | sim | `ReactNode` |
| onClose | sim | `() => void` |
| closeLabel | não | `string \| undefined` |
| className | não | `string \| undefined` |

Dialog e Drawer usam dialog.showModal: foco contido nativo, Escape, restauração de foco. Tooltip abre em foco/hover, fecha por Escape; Popover fecha por Escape ou clique externo.

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Tooltip

Categoria: overlays.

```tsx
import { Tooltip } from "@inteiro/react";
<Tooltip text="Contexto adicional">Ajuda</Tooltip>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| text | sim | `string` |
| children | sim | `ReactNode` |

Dialog e Drawer usam dialog.showModal: foco contido nativo, Escape, restauração de foco. Tooltip abre em foco/hover, fecha por Escape; Popover fecha por Escape ou clique externo.

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Popover

Categoria: overlays.

```tsx
import { Popover } from "@inteiro/react";
<Popover label="Filtros">Opções</Popover>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | sim | `string` |
| children | não | `ReactNode` |

Dialog e Drawer usam dialog.showModal: foco contido nativo, Escape, restauração de foco. Tooltip abre em foco/hover, fecha por Escape; Popover fecha por Escape ou clique externo.

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Alert

Categoria: feedback.

```tsx
import { Alert } from "@inteiro/react";
<Alert title="Não foi possível salvar" severity="danger">Verifique a conexão.</Alert>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| title | sim | `string` |
| children | não | `ReactNode` |
| severity | não | `Severity \| undefined` |
| onDismiss | não | `(() => void) \| undefined` |
| dismissLabel | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Banner

Categoria: feedback.

```tsx
import { Banner } from "@inteiro/react";
<Banner title="Manutenção programada" />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| title | sim | `string` |
| children | não | `ReactNode` |
| severity | não | `Severity \| undefined` |
| onDismiss | não | `(() => void) \| undefined` |
| dismissLabel | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Toast

Categoria: feedback.

```tsx
import { Toast } from "@inteiro/react";
<Toast title="Alterações salvas" severity="success" />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| title | sim | `string` |
| children | não | `ReactNode` |
| severity | não | `Severity \| undefined` |
| onDismiss | não | `(() => void) \| undefined` |
| dismissLabel | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Progress

Categoria: feedback.

```tsx
import { Progress } from "@inteiro/react";
<Progress label="Upload" value={40} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| value | não | `number \| undefined` |
| max | não | `number \| undefined` |
| label | sim | `string` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Spinner

Categoria: feedback.

```tsx
import { Spinner } from "@inteiro/react";
<Spinner label="Carregando dados" />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Skeleton

Categoria: feedback.

```tsx
import { Skeleton } from "@inteiro/react";
<Skeleton />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| label | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Navigation

Categoria: navigation.

```tsx
import { Navigation } from "@inteiro/react";
<Navigation items={[{href:"/",label:"Início",current:true}]} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| items | sim | `NavItem[]` |
| label | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## SideNav

Categoria: navigation.

```tsx
import { SideNav } from "@inteiro/react";
<SideNav items={[{href:"/",label:"Início"}]} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| items | sim | `NavItem[]` |
| label | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Breadcrumbs

Categoria: navigation.

```tsx
import { Breadcrumbs } from "@inteiro/react";
<Breadcrumbs items={[{href:"/",label:"Início"}]} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| items | sim | `NavItem[]` |
| label | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Tabs

Categoria: navigation.

```tsx
import { Tabs } from "@inteiro/react";
<Tabs label="Projeto" items={[{id:"overview",label:"Visão geral",content:<p>Resumo</p>}]} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| items | sim | `TabItem[]` |
| label | sim | `string` |
| orientation | não | `"horizontal" \| "vertical" \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Pagination

Categoria: navigation.

```tsx
import { Pagination } from "@inteiro/react";
<Pagination page={1} pageCount={4} onPageChange={setPage} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| page | sim | `number` |
| pageCount | sim | `number` |
| onPageChange | sim | `(page: number) => void` |
| label | não | `string \| undefined` |
| previousLabel | não | `string \| undefined` |
| nextLabel | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## DataTable

Categoria: data.

```tsx
import { DataTable } from "@inteiro/react";
<DataTable caption="Projetos" rows={[{id:"1",name:"Inteiro"}]} rowKey="id" columns={[{key:"name",label:"Nome"}]} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| rows | sim | `T[]` |
| columns | sim | `DataColumn<T>[]` |
| caption | sim | `string` |
| rowKey | sim | `keyof T` |
| pageSize | não | `number \| undefined` |
| searchLabel | não | `string \| undefined` |
| emptyMessage | não | `string \| undefined` |
| paginationLabels | não | `{ label?: string \| undefined; previousLabel?: string \| undefined; nextLabel?: string \| undefined; } \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## Chart

Categoria: data.

```tsx
import { Chart } from "@inteiro/react";
<Chart title="Entregas" kind="bar" data={[{label:"Outubro",value:12}]} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| title | sim | `string` |
| data | sim | `ChartPoint[]` |
| kind | não | `"line" \| "bar" \| "pie" \| undefined` |
| labels | não | `{ series: string; value: string; data: string; } \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest, hover, focus-visible, disabled, error, loading.

## PageTemplate

Categoria: templates.

```tsx
import { PageTemplate } from "@inteiro/react";
<PageTemplate title="Projeto"><Card>Conteúdo</Card></PageTemplate>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| title | sim | `string` |
| description | não | `string \| undefined` |
| children | sim | `ReactNode` |
| actions | não | `ReactNode` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## AppShell

Categoria: templates.

```tsx
import { AppShell } from "@inteiro/react";
<AppShell title="Inteiro" navigation={[{href:"/",label:"Início"}]}><h1>Projeto</h1></AppShell>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| navigation | sim | `NavItem[]` |
| children | sim | `ReactNode` |
| title | sim | `string` |
| footer | não | `ReactNode` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## LoginTemplate

Categoria: templates.

```tsx
import { LoginTemplate } from "@inteiro/react";
<LoginTemplate onSubmit={authenticate} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| onSubmit | sim | `(credentials: { email: string; password: string; }) => Promise<void>` |
| title | não | `string \| undefined` |
| error | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## DashboardTemplate

Categoria: templates.

```tsx
import { DashboardTemplate } from "@inteiro/react";
<DashboardTemplate title="Operação" metrics={[{label:"Entregas",value:"12"}]} data={[{label:"Hoje",value:12}]} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| title | sim | `string` |
| metrics | sim | `{ label: string; value: string; }[]` |
| data | sim | `ChartPoint[]` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## MasterDetailTemplate

Categoria: templates.

```tsx
import { MasterDetailTemplate } from "@inteiro/react";
<MasterDetailTemplate title="Projetos" list={<List items={["Inteiro"]} />} detail={<Card>Detalhes</Card>} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| title | sim | `string` |
| list | sim | `ReactNode` |
| detail | sim | `ReactNode` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## SettingsTemplate

Categoria: templates.

```tsx
import { SettingsTemplate } from "@inteiro/react";
<SettingsTemplate><Switch label="Avisos" /></SettingsTemplate>
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| title | não | `string \| undefined` |
| children | sim | `ReactNode` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## DataTemplate

Categoria: templates.

```tsx
import { DataTemplate } from "@inteiro/react";
<DataTemplate rows={[{id:"1",name:"Inteiro",status:"Ativo"}]} />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| rows | sim | `{ id: string; name: string; status: string; }[]` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## EmptyState

Categoria: templates.

```tsx
import { EmptyState } from "@inteiro/react";
<EmptyState description="Crie o primeiro projeto." />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| title | não | `string \| undefined` |
| description | sim | `string` |
| action | não | `ReactNode` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.

## ErrorTemplate

Categoria: templates.

```tsx
import { ErrorTemplate } from "@inteiro/react";
<ErrorTemplate code="404" />
```

| Prop | Obrigatória | Tipo |
|---|---|---|
| code | não | `string \| undefined` |
| title | não | `string \| undefined` |
| description | não | `string \| undefined` |
| homeHref | não | `string \| undefined` |

Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir="rtl".

Estados aplicáveis à categoria: rest.
