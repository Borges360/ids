import componentProps from "./component-props.json" with { type: "json" };
export interface ComponentContract {
  name: string;
  category: string;
  import: string;
  css: string;
  example: string;
  accessibility: string[];
  states: string[];
  props: { name: string; required: boolean; type: string }[];
}
const groups: Record<string, string[]> = {
  actions: ["Button", "IconButton"],
  forms: [
    "TextField",
    "Textarea",
    "Select",
    "MultiSelect",
    "Search",
    "Checkbox",
    "Radio",
    "Switch",
    "DatePicker",
    "TimePicker",
    "Form",
    "InlineEdit",
  ],
  display: [
    "Badge",
    "Tag",
    "Avatar",
    "AvatarGroup",
    "Card",
    "CardHeader",
    "CardBody",
    "CardFooter",
    "Panel",
    "Heading",
    "Text",
    "Code",
    "CodeBlock",
    "List",
    "Grid",
  ],
  overlays: ["Dialog", "Drawer", "Tooltip", "Popover"],
  feedback: ["Alert", "Banner", "Toast", "Progress", "Spinner", "Skeleton"],
  navigation: ["Navigation", "SideNav", "Breadcrumbs", "Tabs", "Pagination"],
  data: ["DataTable", "Chart"],
  templates: [
    "PageTemplate",
    "AppShell",
    "LoginTemplate",
    "DashboardTemplate",
    "MasterDetailTemplate",
    "SettingsTemplate",
    "DataTemplate",
    "EmptyState",
    "ErrorTemplate",
  ],
};
const examples: Record<string, string> = {
  Button: '<Button variant="outline" size="md">Revisar</Button>',
  IconButton: '<IconButton label="Favoritar">☆</IconButton>',
  TextField:
    '<TextField label="E-mail" type="email" error="Informe um e-mail válido." />',
  Textarea: '<Textarea label="Descrição" rows={4} />',
  Select:
    '<Select label="Ambiente" options={[{value:"prod",label:"Produção"}]} />',
  MultiSelect:
    '<MultiSelect label="Equipes" options={[{value:"design",label:"Design"}]} />',
  Checkbox: '<Checkbox label="Aceito os termos" />',
  Radio: '<Radio name="density" value="focus" label="Focus" />',
  Switch: '<Switch label="Receber avisos" />',
  DatePicker: '<DatePicker label="Data" min="2026-01-01" />',
  TimePicker: '<TimePicker label="Horário" />',
  Search: '<Search label="Pesquisar" />',
  Dialog:
    '<Dialog open={open} onClose={() => setOpen(false)} title="Revisar"><p>Confira as alterações.</p></Dialog>',
  Drawer:
    '<Drawer open={open} onClose={() => setOpen(false)} title="Filtros">Conteúdo</Drawer>',
  Tabs: '<Tabs label="Projeto" items={[{id:"overview",label:"Visão geral",content:<p>Resumo</p>}]} />',
  DataTable:
    '<DataTable caption="Projetos" rows={[{id:"1",name:"Inteiro"}]} rowKey="id" columns={[{key:"name",label:"Nome"}]} />',
  Chart:
    '<Chart title="Entregas" kind="bar" data={[{label:"Outubro",value:12}]} />',
  Alert:
    '<Alert title="Não foi possível salvar" severity="danger">Verifique a conexão.</Alert>',
  Banner: '<Banner title="Manutenção programada" />',
  Toast: '<Toast title="Alterações salvas" severity="success" />',
  Avatar: '<Avatar name="Luiz Borges" />',
  AvatarGroup: '<AvatarGroup><Avatar name="Luiz Borges" /></AvatarGroup>',
  Badge: '<Badge severity="success">Concluído</Badge>',
  Tag: "<Tag onRemove={remove}>Design</Tag>",
  Tooltip: '<Tooltip text="Contexto adicional">Ajuda</Tooltip>',
  Popover: '<Popover label="Filtros">Opções</Popover>',
  Progress: '<Progress label="Upload" value={40} />',
  Spinner: '<Spinner label="Carregando dados" />',
  Skeleton: "<Skeleton />",
  Navigation: '<Navigation items={[{href:"/",label:"Início",current:true}]} />',
  SideNav: '<SideNav items={[{href:"/",label:"Início"}]} />',
  Breadcrumbs: '<Breadcrumbs items={[{href:"/",label:"Início"}]} />',
  Pagination: "<Pagination page={1} pageCount={4} onPageChange={setPage} />",
  Card: '<Card title="Projeto" footer={<Button>Revisar</Button>}>Conteúdo</Card>',
  Panel: '<Panel title="Detalhes">Conteúdo</Panel>',
  CardHeader: '<CardHeader title="Projeto" />',
  CardBody: "<CardBody>Conteúdo</CardBody>",
  CardFooter: "<CardFooter><Button>Revisar</Button></CardFooter>",
  Heading: "<Heading level={2}>Detalhes</Heading>",
  Text: "<Text>Descrição do projeto.</Text>",
  Code: "<Code>npm run build</Code>",
  CodeBlock: '<CodeBlock>{"npm run build"}</CodeBlock>',
  List: '<List items={["Primeiro", "Segundo"]} />',
  Grid: '<Grid><Card title="Métrica">12</Card></Grid>',
  Form: '<Form onSubmit={save}><TextField label="Nome" required /><Button type="submit">Salvar</Button></Form>',
  InlineEdit: '<InlineEdit label="Nome" value={name} onSave={setName} />',
  PageTemplate:
    '<PageTemplate title="Projeto"><Card>Conteúdo</Card></PageTemplate>',
  AppShell:
    '<AppShell title="Inteiro" navigation={[{href:"/",label:"Início"}]}><h1>Projeto</h1></AppShell>',
  LoginTemplate: "<LoginTemplate onSubmit={authenticate} />",
  DashboardTemplate:
    '<DashboardTemplate title="Operação" metrics={[{label:"Entregas",value:"12"}]} data={[{label:"Hoje",value:12}]} />',
  MasterDetailTemplate:
    '<MasterDetailTemplate title="Projetos" list={<List items={["Inteiro"]} />} detail={<Card>Detalhes</Card>} />',
  SettingsTemplate:
    '<SettingsTemplate><Switch label="Avisos" /></SettingsTemplate>',
  DataTemplate:
    '<DataTemplate rows={[{id:"1",name:"Inteiro",status:"Ativo"}]} />',
  EmptyState: '<EmptyState description="Crie o primeiro projeto." />',
  ErrorTemplate: '<ErrorTemplate code="404" />',
};
export const COMPONENTS: ComponentContract[] = Object.entries(groups).flatMap(
  ([category, names]) =>
    names.map((name) => ({
      name,
      props:
        (componentProps as Record<string, ComponentContract["props"]>)[name] ??
        [],
      category,
      import: `import { ${name} } from "@inteiro/react";`,
      css: "@inteiro/design-system/css/components",
      example: examples[name]!,
      accessibility:
        category === "overlays"
          ? [
              "Dialog e Drawer usam dialog.showModal: foco contido nativo, Escape, restauração de foco.",
              "Tooltip abre em foco/hover, fecha por Escape; Popover fecha por Escape ou clique externo.",
            ]
          : [
              "Usar nome acessível e HTML semântico.",
              'Foco visível, textos dinâmicos e suporte a dir="rtl".',
            ],
      states: [
        "rest",
        "hover",
        "focus-visible",
        "disabled",
        "error",
        "loading",
      ].filter(
        (s) => !["display", "templates"].includes(category) || s === "rest",
      ),
    })),
);
export function getComponentContract(name?: string) {
  if (!name) return COMPONENTS;
  const result = COMPONENTS.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (!result) throw new Error(`Componente não encontrado: ${name}`);
  return result;
}
