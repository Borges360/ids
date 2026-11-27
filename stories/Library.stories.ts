import { createElement as h } from "react";
import {
  Button,
  TextField,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Switch,
  DatePicker,
  TimePicker,
  Badge,
  Avatar,
  Card,
  Alert,
  Tabs,
  DataTable,
  Chart,
  Progress,
  Spinner,
  Skeleton,
  Tooltip,
  Popover,
  Navigation,
  Breadcrumbs,
  InlineEdit,
  CodeBlock,
} from "../packages/react/src/index.ts";
export default {
  title: "Biblioteca/Componentes",
  tags: ["autodocs"],
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "commit", "danger", "secondary", "ghost", "quiet"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
  },
};
export const Playground = {
  args: { children: "Revisar", variant: "primary", size: "md" },
};
export const Buttons = {
  render: () =>
    h(
      "div",
      { className: "in-row" },
      ["primary", "commit", "danger", "secondary", "ghost", "quiet"].flatMap(
        (variant) =>
          ["sm", "md", "lg"].map((size) =>
            h(
              Button,
              {
                key: variant + size,
                variant: variant as any,
                size: size as any,
              },
              `${variant} ${size}`,
            ),
          ),
      ),
      h(Button, { disabled: true }, "Indisponível"),
      h(Button, { loading: true }, "Salvando"),
    ),
};
export const Forms = {
  render: () =>
    h(
      "div",
      { className: "in-stack" },
      h(TextField, { label: "E-mail", type: "email" }),
      h(TextField, { label: "Nome", error: "Informe o nome completo." }),
      h(TextField, { label: "ID", value: "IDS-1", readOnly: true }),
      h(Textarea, { label: "Descrição" }),
      h(Select, {
        label: "Ambiente",
        options: [
          { value: "prod", label: "Produção" },
          { value: "dev", label: "Desenvolvimento" },
        ],
      }),
      h(Checkbox, { label: "Aceito os termos" }),
      h(Radio, { name: "density", label: "Focus" }),
      h(Switch, { label: "Avisos" }),
      h(DatePicker, { label: "Data" }),
      h(TimePicker, { label: "Horário" }),
      h(InlineEdit, { label: "Projeto", value: "Inteiro", onSave: () => {} }),
    ),
};
export const Feedback = {
  render: () =>
    h(
      "div",
      { className: "in-stack" },
      ["success", "warning", "danger", "info"].map((severity) =>
        h(
          Alert,
          {
            key: severity,
            title: `Estado: ${severity}`,
            severity: severity as any,
          },
          "Mensagem com uma próxima ação.",
        ),
      ),
      h(Progress, { label: "Upload", value: 40 }),
      h(Spinner),
      h(Skeleton),
      h(Badge, { severity: "success" }, "Concluído"),
    ),
};
export const NavigationExample = {
  render: () =>
    h(
      "div",
      { className: "in-stack" },
      h(Navigation, {
        items: [
          { href: "#", label: "Início", current: true },
          { href: "#settings", label: "Configurações" },
        ],
      }),
      h(Breadcrumbs, {
        items: [
          { href: "#", label: "Início" },
          { href: "#project", label: "Projeto" },
        ],
      }),
      h(Tabs, {
        label: "Projeto",
        items: [
          { id: "one", label: "Resumo", content: "Resumo do projeto" },
          { id: "two", label: "Histórico", content: "Histórico de alterações" },
        ],
      }),
    ),
};
export const Data = {
  render: () =>
    h(
      "div",
      { className: "in-stack" },
      h(DataTable, {
        caption: "Projetos",
        rowKey: "id",
        rows: Array.from({ length: 24 }, (_, i) => ({
          id: String(i),
          name: `Projeto ${i}`,
          status: i % 2 ? "Ativo" : "Revisão",
        })),
        columns: [
          { key: "name", label: "Nome" },
          { key: "status", label: "Status" },
        ],
      }),
      ...["bar", "line", "pie"].map((kind) =>
        h(Chart, {
          key: kind,
          kind: kind as any,
          title: `Entregas ${kind}`,
          data: [
            { label: "Design", value: 12 },
            { label: "Código", value: 18 },
            { label: "Revisão", value: 7 },
          ],
        }),
      ),
    ),
};
export const Display = {
  render: () =>
    h(
      "div",
      { className: "in-stack" },
      h(
        Card,
        { title: "Projeto" },
        h(Avatar, { name: "Luiz Borges" }),
        "Detalhes do projeto.",
      ),
      h(Tooltip, { text: "Contexto adicional" }, "Ajuda"),
      h(Popover, { label: "Filtros" }, h(Checkbox, { label: "Apenas ativos" })),
      h(CodeBlock, null, "npm run build"),
    ),
};
