// Gerado por scripts/generate-library-docs.mjs
export const libraryPages = [
  {
    "id": "components/library",
    "title": "Biblioteca React",
    "lede": "55 componentes e templates implementados. Exemplos, imports e acessibilidade.",
    "status": "implementado",
    "source": "@inteiro/react · docs/LIBRARY.md",
    "sections": [
      {
        "id": "button",
        "title": "Button",
        "html": "<p>actions · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Button } from \"@inteiro/react\";\n&lt;Button variant=\"outline\" size=\"md\"&gt;Revisar&lt;/Button&gt;</code></pre>"
      },
      {
        "id": "iconbutton",
        "title": "IconButton",
        "html": "<p>actions · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { IconButton } from \"@inteiro/react\";\n&lt;IconButton label=\"Favoritar\"&gt;☆&lt;/IconButton&gt;</code></pre>"
      },
      {
        "id": "textfield",
        "title": "TextField",
        "html": "<p>forms · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { TextField } from \"@inteiro/react\";\n&lt;TextField label=\"E-mail\" type=\"email\" error=\"Informe um e-mail válido.\" /&gt;</code></pre>"
      },
      {
        "id": "textarea",
        "title": "Textarea",
        "html": "<p>forms · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Textarea } from \"@inteiro/react\";\n&lt;Textarea label=\"Descrição\" rows={4} /&gt;</code></pre>"
      },
      {
        "id": "select",
        "title": "Select",
        "html": "<p>forms · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Select } from \"@inteiro/react\";\n&lt;Select label=\"Ambiente\" options={[{value:\"prod\",label:\"Produção\"}]} /&gt;</code></pre>"
      },
      {
        "id": "multiselect",
        "title": "MultiSelect",
        "html": "<p>forms · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { MultiSelect } from \"@inteiro/react\";\n&lt;MultiSelect label=\"Equipes\" options={[{value:\"design\",label:\"Design\"}]} /&gt;</code></pre>"
      },
      {
        "id": "search",
        "title": "Search",
        "html": "<p>forms · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Search } from \"@inteiro/react\";\n&lt;Search label=\"Pesquisar\" /&gt;</code></pre>"
      },
      {
        "id": "checkbox",
        "title": "Checkbox",
        "html": "<p>forms · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Checkbox } from \"@inteiro/react\";\n&lt;Checkbox label=\"Aceito os termos\" /&gt;</code></pre>"
      },
      {
        "id": "radio",
        "title": "Radio",
        "html": "<p>forms · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Radio } from \"@inteiro/react\";\n&lt;Radio name=\"density\" value=\"focus\" label=\"Focus\" /&gt;</code></pre>"
      },
      {
        "id": "switch",
        "title": "Switch",
        "html": "<p>forms · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Switch } from \"@inteiro/react\";\n&lt;Switch label=\"Receber avisos\" /&gt;</code></pre>"
      },
      {
        "id": "datepicker",
        "title": "DatePicker",
        "html": "<p>forms · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { DatePicker } from \"@inteiro/react\";\n&lt;DatePicker label=\"Data\" min=\"2026-01-01\" /&gt;</code></pre>"
      },
      {
        "id": "timepicker",
        "title": "TimePicker",
        "html": "<p>forms · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { TimePicker } from \"@inteiro/react\";\n&lt;TimePicker label=\"Horário\" /&gt;</code></pre>"
      },
      {
        "id": "form",
        "title": "Form",
        "html": "<p>forms · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Form } from \"@inteiro/react\";\n&lt;Form onSubmit={save}&gt;&lt;TextField label=\"Nome\" required /&gt;&lt;Button type=\"submit\"&gt;Salvar&lt;/Button&gt;&lt;/Form&gt;</code></pre>"
      },
      {
        "id": "inlineedit",
        "title": "InlineEdit",
        "html": "<p>forms · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { InlineEdit } from \"@inteiro/react\";\n&lt;InlineEdit label=\"Nome\" value={name} onSave={setName} /&gt;</code></pre>"
      },
      {
        "id": "badge",
        "title": "Badge",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Badge } from \"@inteiro/react\";\n&lt;Badge severity=\"success\"&gt;Concluído&lt;/Badge&gt;</code></pre>"
      },
      {
        "id": "tag",
        "title": "Tag",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Tag } from \"@inteiro/react\";\n&lt;Tag onRemove={remove}&gt;Design&lt;/Tag&gt;</code></pre>"
      },
      {
        "id": "avatar",
        "title": "Avatar",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Avatar } from \"@inteiro/react\";\n&lt;Avatar name=\"Luiz Borges\" /&gt;</code></pre>"
      },
      {
        "id": "avatargroup",
        "title": "AvatarGroup",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { AvatarGroup } from \"@inteiro/react\";\n&lt;AvatarGroup&gt;&lt;Avatar name=\"Luiz Borges\" /&gt;&lt;/AvatarGroup&gt;</code></pre>"
      },
      {
        "id": "card",
        "title": "Card",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Card } from \"@inteiro/react\";\n&lt;Card title=\"Projeto\" footer={&lt;Button&gt;Revisar&lt;/Button&gt;}&gt;Conteúdo&lt;/Card&gt;</code></pre>"
      },
      {
        "id": "cardheader",
        "title": "CardHeader",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { CardHeader } from \"@inteiro/react\";\n&lt;CardHeader title=\"Projeto\" /&gt;</code></pre>"
      },
      {
        "id": "cardbody",
        "title": "CardBody",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { CardBody } from \"@inteiro/react\";\n&lt;CardBody&gt;Conteúdo&lt;/CardBody&gt;</code></pre>"
      },
      {
        "id": "cardfooter",
        "title": "CardFooter",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { CardFooter } from \"@inteiro/react\";\n&lt;CardFooter&gt;&lt;Button&gt;Revisar&lt;/Button&gt;&lt;/CardFooter&gt;</code></pre>"
      },
      {
        "id": "panel",
        "title": "Panel",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Panel } from \"@inteiro/react\";\n&lt;Panel title=\"Detalhes\"&gt;Conteúdo&lt;/Panel&gt;</code></pre>"
      },
      {
        "id": "heading",
        "title": "Heading",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Heading } from \"@inteiro/react\";\n&lt;Heading level={2}&gt;Detalhes&lt;/Heading&gt;</code></pre>"
      },
      {
        "id": "text",
        "title": "Text",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Text } from \"@inteiro/react\";\n&lt;Text&gt;Descrição do projeto.&lt;/Text&gt;</code></pre>"
      },
      {
        "id": "code",
        "title": "Code",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Code } from \"@inteiro/react\";\n&lt;Code&gt;npm run build&lt;/Code&gt;</code></pre>"
      },
      {
        "id": "codeblock",
        "title": "CodeBlock",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { CodeBlock } from \"@inteiro/react\";\n&lt;CodeBlock&gt;{\"npm run build\"}&lt;/CodeBlock&gt;</code></pre>"
      },
      {
        "id": "list",
        "title": "List",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { List } from \"@inteiro/react\";\n&lt;List items={[\"Primeiro\", \"Segundo\"]} /&gt;</code></pre>"
      },
      {
        "id": "grid",
        "title": "Grid",
        "html": "<p>display · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Grid } from \"@inteiro/react\";\n&lt;Grid&gt;&lt;Card title=\"Métrica\"&gt;12&lt;/Card&gt;&lt;/Grid&gt;</code></pre>"
      },
      {
        "id": "dialog",
        "title": "Dialog",
        "html": "<p>overlays · Dialog e Drawer usam dialog.showModal: foco contido nativo, Escape, restauração de foco. Tooltip abre em foco/hover, fecha por Escape; Popover fecha por Escape ou clique externo.</p><pre tabindex=\"0\"><code>import { Dialog } from \"@inteiro/react\";\n&lt;Dialog open={open} onClose={() =&gt; setOpen(false)} title=\"Revisar\"&gt;&lt;p&gt;Confira as alterações.&lt;/p&gt;&lt;/Dialog&gt;</code></pre>"
      },
      {
        "id": "drawer",
        "title": "Drawer",
        "html": "<p>overlays · Dialog e Drawer usam dialog.showModal: foco contido nativo, Escape, restauração de foco. Tooltip abre em foco/hover, fecha por Escape; Popover fecha por Escape ou clique externo.</p><pre tabindex=\"0\"><code>import { Drawer } from \"@inteiro/react\";\n&lt;Drawer open={open} onClose={() =&gt; setOpen(false)} title=\"Filtros\"&gt;Conteúdo&lt;/Drawer&gt;</code></pre>"
      },
      {
        "id": "tooltip",
        "title": "Tooltip",
        "html": "<p>overlays · Dialog e Drawer usam dialog.showModal: foco contido nativo, Escape, restauração de foco. Tooltip abre em foco/hover, fecha por Escape; Popover fecha por Escape ou clique externo.</p><pre tabindex=\"0\"><code>import { Tooltip } from \"@inteiro/react\";\n&lt;Tooltip text=\"Contexto adicional\"&gt;Ajuda&lt;/Tooltip&gt;</code></pre>"
      },
      {
        "id": "popover",
        "title": "Popover",
        "html": "<p>overlays · Dialog e Drawer usam dialog.showModal: foco contido nativo, Escape, restauração de foco. Tooltip abre em foco/hover, fecha por Escape; Popover fecha por Escape ou clique externo.</p><pre tabindex=\"0\"><code>import { Popover } from \"@inteiro/react\";\n&lt;Popover label=\"Filtros\"&gt;Opções&lt;/Popover&gt;</code></pre>"
      },
      {
        "id": "alert",
        "title": "Alert",
        "html": "<p>feedback · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Alert } from \"@inteiro/react\";\n&lt;Alert title=\"Não foi possível salvar\" severity=\"danger\"&gt;Verifique a conexão.&lt;/Alert&gt;</code></pre>"
      },
      {
        "id": "banner",
        "title": "Banner",
        "html": "<p>feedback · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Banner } from \"@inteiro/react\";\n&lt;Banner title=\"Manutenção programada\" /&gt;</code></pre>"
      },
      {
        "id": "toast",
        "title": "Toast",
        "html": "<p>feedback · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Toast } from \"@inteiro/react\";\n&lt;Toast title=\"Alterações salvas\" severity=\"success\" /&gt;</code></pre>"
      },
      {
        "id": "progress",
        "title": "Progress",
        "html": "<p>feedback · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Progress } from \"@inteiro/react\";\n&lt;Progress label=\"Upload\" value={40} /&gt;</code></pre>"
      },
      {
        "id": "spinner",
        "title": "Spinner",
        "html": "<p>feedback · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Spinner } from \"@inteiro/react\";\n&lt;Spinner label=\"Carregando dados\" /&gt;</code></pre>"
      },
      {
        "id": "skeleton",
        "title": "Skeleton",
        "html": "<p>feedback · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Skeleton } from \"@inteiro/react\";\n&lt;Skeleton /&gt;</code></pre>"
      },
      {
        "id": "navigation",
        "title": "Navigation",
        "html": "<p>navigation · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Navigation } from \"@inteiro/react\";\n&lt;Navigation items={[{href:\"/\",label:\"Início\",current:true}]} /&gt;</code></pre>"
      },
      {
        "id": "sidenav",
        "title": "SideNav",
        "html": "<p>navigation · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { SideNav } from \"@inteiro/react\";\n&lt;SideNav items={[{href:\"/\",label:\"Início\"}]} /&gt;</code></pre>"
      },
      {
        "id": "breadcrumbs",
        "title": "Breadcrumbs",
        "html": "<p>navigation · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Breadcrumbs } from \"@inteiro/react\";\n&lt;Breadcrumbs items={[{href:\"/\",label:\"Início\"}]} /&gt;</code></pre>"
      },
      {
        "id": "tabs",
        "title": "Tabs",
        "html": "<p>navigation · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Tabs } from \"@inteiro/react\";\n&lt;Tabs label=\"Projeto\" items={[{id:\"overview\",label:\"Visão geral\",content:&lt;p&gt;Resumo&lt;/p&gt;}]} /&gt;</code></pre>"
      },
      {
        "id": "pagination",
        "title": "Pagination",
        "html": "<p>navigation · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Pagination } from \"@inteiro/react\";\n&lt;Pagination page={1} pageCount={4} onPageChange={setPage} /&gt;</code></pre>"
      },
      {
        "id": "datatable",
        "title": "DataTable",
        "html": "<p>data · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { DataTable } from \"@inteiro/react\";\n&lt;DataTable caption=\"Projetos\" rows={[{id:\"1\",name:\"Inteiro\"}]} rowKey=\"id\" columns={[{key:\"name\",label:\"Nome\"}]} /&gt;</code></pre>"
      },
      {
        "id": "chart",
        "title": "Chart",
        "html": "<p>data · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { Chart } from \"@inteiro/react\";\n&lt;Chart title=\"Entregas\" kind=\"bar\" data={[{label:\"Outubro\",value:12}]} /&gt;</code></pre>"
      },
      {
        "id": "pagetemplate",
        "title": "PageTemplate",
        "html": "<p>templates · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { PageTemplate } from \"@inteiro/react\";\n&lt;PageTemplate title=\"Projeto\"&gt;&lt;Card&gt;Conteúdo&lt;/Card&gt;&lt;/PageTemplate&gt;</code></pre>"
      },
      {
        "id": "appshell",
        "title": "AppShell",
        "html": "<p>templates · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { AppShell } from \"@inteiro/react\";\n&lt;AppShell title=\"Inteiro\" navigation={[{href:\"/\",label:\"Início\"}]}&gt;&lt;h1&gt;Projeto&lt;/h1&gt;&lt;/AppShell&gt;</code></pre>"
      },
      {
        "id": "logintemplate",
        "title": "LoginTemplate",
        "html": "<p>templates · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { LoginTemplate } from \"@inteiro/react\";\n&lt;LoginTemplate onSubmit={authenticate} /&gt;</code></pre>"
      },
      {
        "id": "dashboardtemplate",
        "title": "DashboardTemplate",
        "html": "<p>templates · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { DashboardTemplate } from \"@inteiro/react\";\n&lt;DashboardTemplate title=\"Operação\" metrics={[{label:\"Entregas\",value:\"12\"}]} data={[{label:\"Hoje\",value:12}]} /&gt;</code></pre>"
      },
      {
        "id": "masterdetailtemplate",
        "title": "MasterDetailTemplate",
        "html": "<p>templates · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { MasterDetailTemplate } from \"@inteiro/react\";\n&lt;MasterDetailTemplate title=\"Projetos\" list={&lt;List items={[\"Inteiro\"]} /&gt;} detail={&lt;Card&gt;Detalhes&lt;/Card&gt;} /&gt;</code></pre>"
      },
      {
        "id": "settingstemplate",
        "title": "SettingsTemplate",
        "html": "<p>templates · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { SettingsTemplate } from \"@inteiro/react\";\n&lt;SettingsTemplate&gt;&lt;Switch label=\"Avisos\" /&gt;&lt;/SettingsTemplate&gt;</code></pre>"
      },
      {
        "id": "datatemplate",
        "title": "DataTemplate",
        "html": "<p>templates · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { DataTemplate } from \"@inteiro/react\";\n&lt;DataTemplate rows={[{id:\"1\",name:\"Inteiro\",status:\"Ativo\"}]} /&gt;</code></pre>"
      },
      {
        "id": "emptystate",
        "title": "EmptyState",
        "html": "<p>templates · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { EmptyState } from \"@inteiro/react\";\n&lt;EmptyState description=\"Crie o primeiro projeto.\" /&gt;</code></pre>"
      },
      {
        "id": "errortemplate",
        "title": "ErrorTemplate",
        "html": "<p>templates · Usar nome acessível e HTML semântico. Foco visível, textos dinâmicos e suporte a dir=\"rtl\".</p><pre tabindex=\"0\"><code>import { ErrorTemplate } from \"@inteiro/react\";\n&lt;ErrorTemplate code=\"404\" /&gt;</code></pre>"
      }
    ]
  }
];
