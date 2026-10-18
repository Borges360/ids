import { createElement as h, useState } from "react";
import {
  AppShell,
  DashboardTemplate,
  LoginTemplate,
  ErrorTemplate,
  EmptyState,
  SettingsTemplate,
  Switch,
  MasterDetailTemplate,
  Card,
  List,
  Dialog,
  Drawer,
  Button,
} from "../packages/react/src/index.ts";
export default { title: "Biblioteca/Templates", tags: ["autodocs"] };
export const Dashboard = {
  render: () =>
    h(AppShell, {
      title: "Inteiro",
      navigation: [
        { href: "#", label: "Dashboard", current: true },
        { href: "#settings", label: "Configurações" },
      ],
      children: h(DashboardTemplate, {
        title: "Operação",
        metrics: [
          { label: "Entregas", value: "12" },
          { label: "Em revisão", value: "3" },
          { label: "Falhas", value: "0" },
        ],
        data: [
          { label: "Seg", value: 4 },
          { label: "Ter", value: 8 },
          { label: "Qua", value: 12 },
        ],
      }),
    }),
};
export const Login = {
  render: () => h(LoginTemplate, { onSubmit: async () => {} }),
};
export const Error = { render: () => h(ErrorTemplate) };
export const Empty = {
  render: () => h(EmptyState, { description: "Crie seu primeiro projeto." }),
};
export const Settings = {
  render: () =>
    h(SettingsTemplate, { children: h(Switch, { label: "Receber avisos" }) }),
};
export const Detail = {
  render: () =>
    h(MasterDetailTemplate, {
      title: "Projetos",
      list: h(List, { items: ["Inteiro", "Portal"] }),
      detail: h(Card, { title: "Inteiro" }, "Detalhes"),
    }),
};
function OverlayDemo({ drawer = false }: { drawer?: boolean }) {
  const [open, setOpen] = useState(false);
  return h(
    "div",
    null,
    h(Button, { onClick: () => setOpen(true) }, "Abrir"),
    h(drawer ? Drawer : Dialog, {
      open,
      onClose: () => setOpen(false),
      title: "Revisar alterações",
      children: h(Button, { onClick: () => setOpen(false) }, "Concluir"),
    }),
  );
}
export const Modal = { render: () => h(OverlayDemo) };
export const DrawerExample = { render: () => h(OverlayDemo, { drawer: true }) };
