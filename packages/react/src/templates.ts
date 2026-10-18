import {
  createElement as h,
  createContext,
  useContext,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Alert,
  Button,
  Card,
  Chart,
  DataTable,
  Grid,
  Navigation,
  TextField,
  type ChartPoint,
  type NavItem,
} from "./components.ts";

const ShellContext = createContext(false);
export function PageTemplate({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return h(
    useContext(ShellContext) ? "section" : "main",
    { className: "in-container in-stack" },
    h(
      "header",
      null,
      h("h1", null, title),
      description && h("p", null, description),
      actions,
    ),
    children,
  );
}
export function AppShell({
  navigation,
  children,
  title,
  footer,
}: {
  navigation: NavItem[];
  children: ReactNode;
  title: string;
  footer?: ReactNode;
}) {
  return h(
    "div",
    { className: "in-app-shell" },
    h(
      "a",
      { href: "#main-content", className: "in-skip-link" },
      "Saltar para o conteúdo",
    ),
    h(
      "header",
      { className: "in-app-header" },
      h("strong", null, title),
      h(
        "details",
        { className: "in-mobile-nav" },
        h("summary", null, "Menu"),
        h(Navigation, { items: navigation }),
      ),
    ),
    h(
      "aside",
      { className: "in-app-sidebar" },
      h(Navigation, { items: navigation }),
    ),
    h(
      "main",
      { id: "main-content", className: "in-stack" },
      h(ShellContext.Provider, { value: true }, children),
    ),
    h("footer", null, footer),
  );
}
export function LoginTemplate({
  onSubmit,
  title = "Entrar",
  error,
}: {
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>;
  title?: string;
  error?: string;
}) {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setFailure("");
    try {
      await onSubmit({
        email: String(data.get("email")),
        password: String(data.get("password")),
      });
    } catch {
      setFailure(
        "Não foi possível entrar. Verifique os dados e tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }
  return h(
    "main",
    { className: "in-login" },
    h(
      Card,
      { title },
      h(
        "form",
        { className: "in-stack", onSubmit: submit },
        (error || failure) &&
          h(Alert, { severity: "danger", title: error || failure }),
        h(TextField, {
          name: "email",
          label: "E-mail",
          type: "email",
          autoComplete: "username",
          required: true,
        }),
        h(TextField, {
          name: "password",
          label: "Senha",
          type: "password",
          autoComplete: "current-password",
          required: true,
        }),
        h(Button, { type: "submit", loading: pending }, title),
      ),
    ),
  );
}
export function DashboardTemplate({
  title,
  metrics,
  data,
}: {
  title: string;
  metrics: { label: string; value: string }[];
  data: ChartPoint[];
}) {
  return h(PageTemplate, {
    title,
    children: h(
      "div",
      { className: "in-stack" },
      h(
        Grid,
        null,
        metrics.map((m) =>
          h(
            Card,
            { key: m.label, title: m.label },
            h("p", { className: "in-voice-machine" }, m.value),
          ),
        ),
      ),
      h(Chart, { title: "Evolução", data }),
    ),
  });
}
export function MasterDetailTemplate({
  title,
  list,
  detail,
}: {
  title: string;
  list: ReactNode;
  detail: ReactNode;
}) {
  return h(PageTemplate, {
    title,
    children: h(
      "div",
      { className: "in-master-detail" },
      h("section", { "aria-label": "Registros" }, list),
      h("section", { "aria-label": "Detalhes" }, detail),
    ),
  });
}
export function EmptyState({
  title = "Nenhum resultado",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return h(
    "section",
    { className: "in-empty" },
    h("h2", null, title),
    h("p", null, description),
    action,
  );
}
export function ErrorTemplate({
  code = "404",
  title = "Página não encontrada",
  description = "Confira o endereço ou volte ao início.",
  homeHref = "/",
}: {
  code?: string;
  title?: string;
  description?: string;
  homeHref?: string;
}) {
  return h(PageTemplate, {
    title: `${code} — ${title}`,
    description,
    children: h(
      "a",
      { href: homeHref, className: "in-button in-button--secondary" },
      "Voltar ao início",
    ),
  });
}
export function SettingsTemplate({
  title = "Configurações",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return h(PageTemplate, {
    title,
    children: h("div", { className: "in-measure in-stack" }, children),
  });
}
export function DataTemplate({
  rows,
}: {
  rows: { id: string; name: string; status: string }[];
}) {
  return h(PageTemplate, {
    title: "Registros",
    children: h(DataTable, {
      rows,
      rowKey: "id",
      caption: "Registros",
      columns: [
        { key: "name", label: "Nome" },
        { key: "status", label: "Status" },
      ],
    }),
  });
}
