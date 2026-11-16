import {
  createElement as h,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ComponentProps,
  type FormEvent,
  type SyntheticEvent,
} from "react";

const cx = (...names: (string | undefined | false)[]) =>
  names.filter(Boolean).join(" ");
export type ButtonProps = ComponentProps<"button"> & {
  variant?:
    | "primary"
    | "commit"
    | "danger"
    | "secondary"
    | "ghost"
    | "quiet"
    | "solid"
    | "outline"
    | "text";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};
export function Button({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const variants = { solid: "primary", outline: "secondary", text: "ghost" };
  return h(
    "button",
    {
      type: "button",
      ...props,
      disabled: disabled || loading,
      "aria-busy": loading || undefined,
      className: cx(
        "in-button",
        `in-button--${variant in variants ? variants[variant as keyof typeof variants] : variant}`,
        `in-button--${size}`,
        className,
      ),
    },
    loading
      ? h("span", { role: "status", className: "in-sr-only" }, "Carregando")
      : null,
    children,
  );
}
export function IconButton({
  label,
  ...props
}: Omit<ButtonProps, "aria-label"> & { label: string }) {
  return h(Button, { ...props, "aria-label": label });
}

type FieldMeta = { label: string; error?: string; helpText?: string };
function Field({
  id,
  label,
  error,
  helpText,
  children,
}: FieldMeta & { id: string; children: ReactNode }) {
  return h(
    "div",
    { className: "in-field" },
    h("label", { htmlFor: id, className: "in-field__label" }, label),
    children,
    error || helpText
      ? h(
          "p",
          {
            id: `${id}-message`,
            className: cx(
              "in-field__message",
              error && "in-field__message--error",
            ),
            ...(error ? { role: "alert" } : {}),
          },
          error || helpText,
        )
      : null,
  );
}
export type TextFieldProps = ComponentProps<"input"> & FieldMeta;
export function TextField({
  label,
  error,
  helpText,
  id: supplied,
  className,
  ...props
}: TextFieldProps) {
  const generated = useId();
  const id = supplied ?? generated;
  return h(Field, {
    id,
    label,
    ...(error ? { error } : {}),
    ...(helpText ? { helpText } : {}),
    children: h("input", {
      ...props,
      id,
      className: cx("in-input", className),
      "aria-invalid": !!error,
      "aria-describedby":
        [props["aria-describedby"], (error || helpText) && `${id}-message`]
          .filter(Boolean)
          .join(" ") || undefined,
    }),
  });
}
export function Textarea({
  label,
  error,
  helpText,
  id: supplied,
  className,
  ...props
}: ComponentProps<"textarea"> & FieldMeta) {
  const generated = useId();
  const id = supplied ?? generated;
  return h(Field, {
    id,
    label,
    ...(error ? { error } : {}),
    ...(helpText ? { helpText } : {}),
    children: h("textarea", {
      ...props,
      id,
      className: cx("in-input", className),
      "aria-invalid": !!error,
      "aria-describedby":
        [props["aria-describedby"], (error || helpText) && `${id}-message`]
          .filter(Boolean)
          .join(" ") || undefined,
    }),
  });
}
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export function Select({
  label,
  error,
  helpText,
  options,
  id: supplied,
  className,
  ...props
}: ComponentProps<"select"> & FieldMeta & { options: SelectOption[] }) {
  const generated = useId();
  const id = supplied ?? generated;
  return h(Field, {
    id,
    label,
    ...(error ? { error } : {}),
    ...(helpText ? { helpText } : {}),
    children: h(
      "select",
      {
        ...props,
        id,
        className: cx("in-input", className),
        "aria-invalid": !!error,
        "aria-describedby":
          [props["aria-describedby"], (error || helpText) && `${id}-message`]
            .filter(Boolean)
            .join(" ") || undefined,
      },
      options.map((o) =>
        h(
          "option",
          { key: o.value, value: o.value, disabled: o.disabled },
          o.label,
        ),
      ),
    ),
  });
}
export function MultiSelect(props: ComponentProps<typeof Select>) {
  return h(Select, { ...props, multiple: true });
}
export function Search({ label = "Pesquisar", ...props }: TextFieldProps) {
  return h(TextField, { ...props, label, type: "search" });
}
export function DatePicker(props: TextFieldProps) {
  return h(TextField, { ...props, type: "date" });
}
export function TimePicker(props: TextFieldProps) {
  return h(TextField, { ...props, type: "time" });
}
type ChoiceProps = ComponentProps<"input"> & { label: string };
function Choice({ label, className, ...props }: ChoiceProps) {
  return h(
    "label",
    { className: cx("in-choice", className) },
    h("input", props),
    h("span", null, label),
  );
}
export function Checkbox(props: ChoiceProps) {
  return h(Choice, { ...props, type: "checkbox" });
}
export function Radio(props: ChoiceProps) {
  return h(Choice, { ...props, type: "radio" });
}
export function Switch(props: ChoiceProps) {
  return h(Choice, { ...props, type: "checkbox", role: "switch" });
}
export function Form({ children, ...props }: ComponentProps<"form">) {
  return h(
    "form",
    { ...props, className: cx("in-stack", props.className) },
    children,
  );
}

export function Card({
  children,
  title,
  footer,
  image,
  className,
  ...props
}: Omit<ComponentProps<"section">, "title"> & {
  title?: string;
  footer?: ReactNode;
  image?: { src: string; alt: string };
}) {
  return h(
    "section",
    { ...props, className: cx("in-card", className) },
    image && h("img", { ...image, className: "in-card__image" }),
    title && h("h2", null, title),
    children,
    footer && h("footer", { className: "in-row" }, footer),
  );
}
export const Panel = Card;
export function CardHeader({ title }: { title: string }) {
  return h("header", null, h("h2", null, title));
}
export function CardBody({ children }: { children: ReactNode }) {
  return h("div", null, children);
}
export function CardFooter({ children }: { children: ReactNode }) {
  return h("footer", { className: "in-row" }, children);
}
export type Severity =
  "neutral" | "identity" | "success" | "warning" | "danger" | "info";
export function Badge({
  children,
  severity = "neutral",
  ...props
}: ComponentProps<"span"> & { severity?: Severity }) {
  return h(
    "span",
    {
      ...props,
      className: cx("in-badge", `in-badge--${severity}`, props.className),
    },
    children,
  );
}
export function Tag({
  children,
  onRemove,
  removeLabel = "Remover filtro",
}: {
  children: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return h(
    "span",
    { className: "in-badge" },
    children,
    onRemove &&
      h(
        IconButton,
        { label: removeLabel, variant: "text", size: "sm", onClick: onRemove },
        "×",
      ),
  );
}
export function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg";
}) {
  return src
    ? h("img", { src, alt: name, className: `in-avatar in-avatar--${size}` })
    : h(
        "span",
        {
          role: "img",
          "aria-label": name,
          className: `in-avatar in-avatar--${size}`,
        },
        name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((n) => n[0])
          .join(""),
      );
}
export function AvatarGroup({
  children,
  label = "Participantes",
}: {
  children: ReactNode;
  label?: string;
}) {
  return h(
    "div",
    { role: "group", "aria-label": label, className: "in-row" },
    children,
  );
}
export function Alert({
  title,
  children,
  severity = "info",
  onDismiss,
  dismissLabel = "Fechar aviso",
}: {
  title: string;
  children?: ReactNode;
  severity?: Severity;
  onDismiss?: () => void;
  dismissLabel?: string;
}) {
  return h(
    "div",
    {
      className: `in-alert in-alert--${severity}`,
      role: severity === "danger" ? "alert" : "status",
    },
    h("strong", null, title),
    children && h("div", null, children),
    onDismiss &&
      h(
        IconButton,
        { label: dismissLabel, variant: "text", onClick: onDismiss },
        "×",
      ),
  );
}
export const Banner = Alert;
export const Toast = Alert;

export interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  className?: string;
}
export function Dialog({
  open,
  title,
  children,
  onClose,
  closeLabel = "Fechar",
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => {
      if (dialog.open) dialog.close();
      if (open) previous?.focus();
    };
  }, [open]);
  function trap(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key !== "Tab") return;
    const elements = Array.from(
      ref.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ) ?? [],
    ).filter((el) => el.getClientRects().length > 0);
    const first = elements[0];
    const last = elements.at(-1);
    if (!first) {
      e.preventDefault();
      ref.current?.focus();
      return;
    }
    if (
      e.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === ref.current)
    ) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  return h(
    "dialog",
    {
      ref,
      className: cx("in-dialog", className),
      "aria-labelledby": id,
      "aria-modal": true,
      onKeyDown: trap,
      onCancel: (e: SyntheticEvent) => {
        e.preventDefault();
        onClose();
      },
    },
    h(
      "header",
      { className: "in-row" },
      h("h2", { id }, title),
      h(
        IconButton,
        { label: closeLabel, variant: "text", onClick: onClose },
        "×",
      ),
    ),
    children,
  );
}
export function Drawer(props: DialogProps) {
  return h(Dialog, { ...props, className: cx("in-drawer", props.className) });
}
export function Tooltip({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  const id = useId();
  const [dismissed, setDismissed] = useState(false);
  return h(
    "span",
    {
      className: "in-tooltip-wrap",
      onMouseEnter: () => setDismissed(false),
      onFocus: () => setDismissed(false),
      onKeyDown: (e) => {
        if (e.key === "Escape") setDismissed(true);
      },
    },
    h("span", { tabIndex: 0, "aria-describedby": id }, children),
    h(
      "span",
      { id, role: "tooltip", className: "in-tooltip", hidden: dismissed },
      text,
    ),
  );
}
export function Popover({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return h(
    "div",
    {
      ref,
      className: "in-popover-wrap",
      onKeyDown: (e) => {
        if (e.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      },
    },
    h(
      "button",
      {
        ref: trigger,
        type: "button",
        className: "in-button in-button--secondary",
        "aria-expanded": open,
        "aria-controls": id,
        onClick: () => setOpen(!open),
      },
      label,
    ),
    open &&
      h(
        "div",
        { id, className: "in-popover", role: "region", "aria-label": label },
        children,
      ),
  );
}

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}
export function Tabs({
  items,
  label,
  orientation = "horizontal",
}: {
  items: TabItem[];
  label: string;
  orientation?: "horizontal" | "vertical";
}) {
  const uid = useId();
  const [active, setActive] = useState(items.find((i) => !i.disabled)?.id);
  const selected = items.some((i) => i.id === active && !i.disabled)
    ? active
    : items.find((i) => !i.disabled)?.id;
  function move(event: React.KeyboardEvent<HTMLElement>, id: string) {
    const available = items.filter((i) => !i.disabled);
    const index = available.findIndex((i) => i.id === id);
    const nextKey =
      orientation === "vertical"
        ? "ArrowDown"
        : event.currentTarget.closest('[dir="rtl"]')
          ? "ArrowLeft"
          : "ArrowRight";
    const prevKey =
      orientation === "vertical"
        ? "ArrowUp"
        : nextKey === "ArrowLeft"
          ? "ArrowRight"
          : "ArrowLeft";
    let next = index;
    if (event.key === nextKey) next = (index + 1) % available.length;
    else if (event.key === prevKey)
      next = (index - 1 + available.length) % available.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = available.length - 1;
    else return;
    event.preventDefault();
    const item = available[next];
    if (item) {
      setActive(item.id);
      document.getElementById(`${uid}-tab-${item.id}`)?.focus();
    }
  }
  return h(
    "div",
    null,
    h(
      "div",
      {
        role: "tablist",
        "aria-label": label,
        "aria-orientation": orientation,
        className: "in-tabs",
      },
      items.map((item) =>
        h(
          "button",
          {
            key: item.id,
            type: "button",
            role: "tab",
            id: `${uid}-tab-${item.id}`,
            "aria-controls": `${uid}-panel-${item.id}`,
            "aria-selected": selected === item.id,
            disabled: item.disabled,
            tabIndex: selected === item.id ? 0 : -1,
            onClick: () => setActive(item.id),
            onKeyDown: (e) => move(e, item.id),
          },
          item.label,
        ),
      ),
    ),
    items.map((item) =>
      h(
        "div",
        {
          key: item.id,
          role: "tabpanel",
          id: `${uid}-panel-${item.id}`,
          "aria-labelledby": `${uid}-tab-${item.id}`,
          hidden: selected !== item.id,
          tabIndex: 0,
        },
        item.content,
      ),
    ),
  );
}
export interface NavItem {
  href: string;
  label: string;
  current?: boolean;
}
export function Navigation({
  items,
  label = "Principal",
}: {
  items: NavItem[];
  label?: string;
}) {
  return h(
    "nav",
    { "aria-label": label, className: "in-navigation" },
    items.map((item) =>
      h(
        "a",
        {
          key: item.href,
          href: item.href,
          "aria-current": item.current ? "page" : undefined,
        },
        item.label,
      ),
    ),
  );
}
export const SideNav = Navigation;
export function Breadcrumbs({
  items,
  label = "Caminho de navegação",
}: {
  items: NavItem[];
  label?: string;
}) {
  return h(
    "nav",
    { "aria-label": label },
    h(
      "ol",
      { className: "in-breadcrumbs" },
      items.map((item, index) =>
        h(
          "li",
          { key: item.href },
          h(
            "a",
            {
              href: item.href,
              "aria-current": index === items.length - 1 ? "page" : undefined,
            },
            item.label,
          ),
        ),
      ),
    ),
  );
}
export function Pagination({
  page,
  pageCount,
  onPageChange,
  label = "Paginação",
  previousLabel = "Anterior",
  nextLabel = "Próxima",
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label?: string;
  previousLabel?: string;
  nextLabel?: string;
}) {
  return h(
    "nav",
    { "aria-label": label, className: "in-row" },
    h(
      Button,
      {
        variant: "text",
        disabled: page <= 1,
        onClick: () => onPageChange(page - 1),
      },
      previousLabel,
    ),
    h("span", { role: "status" }, `${page} / ${Math.max(1, pageCount)}`),
    h(
      Button,
      {
        variant: "text",
        disabled: page >= pageCount,
        onClick: () => onPageChange(page + 1),
      },
      nextLabel,
    ),
  );
}

export interface DataColumn<T> {
  key: keyof T & string;
  label: string;
  render?: (row: T) => ReactNode;
}
export function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
  caption,
  rowKey,
  pageSize = 10,
  searchLabel = "Pesquisar registros",
  emptyMessage = "Nenhum resultado",
  paginationLabels = {},
}: {
  rows: T[];
  columns: DataColumn<T>[];
  caption: string;
  rowKey: keyof T;
  pageSize?: number;
  searchLabel?: string;
  emptyMessage?: string;
  paginationLabels?: {
    label?: string;
    previousLabel?: string;
    nextLabel?: string;
  };
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: keyof T; ascending: boolean } | null>(
    null,
  );
  const limit = Math.max(1, Math.floor(pageSize) || 10);
  const filtered = rows.filter((row) =>
    columns.some((col) =>
      String(row[col.key] ?? "")
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    ),
  );
  if (sort)
    filtered.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const result =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
              numeric: true,
            });
      return result * (sort.ascending ? 1 : -1);
    });
  const count = Math.max(1, Math.ceil(filtered.length / limit));
  const current = Math.min(page, count);
  return h(
    "div",
    { className: "in-stack" },
    h(Search, {
      label: searchLabel,
      value: query,
      onChange: (e) => {
        setQuery(e.target.value);
        setPage(1);
      },
    }),
    h(
      "div",
      {
        className: "in-table-wrap",
        tabIndex: 0,
        role: "region",
        "aria-label": caption,
      },
      h(
        "table",
        { className: "in-table" },
        h("caption", null, caption),
        h(
          "thead",
          null,
          h(
            "tr",
            null,
            columns.map((col) =>
              h(
                "th",
                {
                  key: col.key,
                  scope: "col",
                  "aria-sort":
                    sort?.key === col.key
                      ? sort.ascending
                        ? "ascending"
                        : "descending"
                      : "none",
                },
                h(
                  Button,
                  {
                    variant: "text",
                    onClick: () =>
                      setSort({
                        key: col.key,
                        ascending:
                          sort?.key === col.key ? !sort.ascending : true,
                      }),
                  },
                  col.label,
                ),
              ),
            ),
          ),
        ),
        h(
          "tbody",
          null,
          filtered.length
            ? filtered
                .slice((current - 1) * limit, current * limit)
                .map((row) =>
                  h(
                    "tr",
                    { key: String(row[rowKey]) },
                    columns.map((col) =>
                      h(
                        "td",
                        { key: col.key },
                        col.render
                          ? col.render(row)
                          : String(row[col.key] ?? ""),
                      ),
                    ),
                  ),
                )
            : h("tr", null, h("td", { colSpan: columns.length }, emptyMessage)),
        ),
      ),
    ),
    h(Pagination, {
      ...paginationLabels,
      page: current,
      pageCount: count,
      onPageChange: setPage,
    }),
  );
}
export function List({ items, label }: { items: ReactNode[]; label?: string }) {
  return h(
    "ul",
    { className: "in-stack", "aria-label": label },
    items.map((item, index) => h("li", { key: index }, item)),
  );
}
export function Grid({ children, className, ...props }: ComponentProps<"div">) {
  return h("div", { ...props, className: cx("in-grid", className) }, children);
}
export function Progress({
  value,
  max = 100,
  label,
}: {
  value?: number;
  max?: number;
  label: string;
}) {
  return h(
    "label",
    { className: "in-field" },
    label,
    h("progress", {
      className: "in-progress",
      max,
      ...(value === undefined
        ? {}
        : { value: Math.max(0, Math.min(max, value)) }),
    }),
  );
}
export function Spinner({ label = "Carregando" }: { label?: string }) {
  return h(
    "span",
    { role: "status", className: "in-row" },
    h("span", { className: "in-spinner", "aria-hidden": true }),
    label,
  );
}
export function Skeleton({
  label = "Carregando conteúdo",
}: {
  label?: string;
}) {
  return h(
    "div",
    { role: "status", className: "in-skeleton" },
    h("span", { className: "in-sr-only" }, label),
  );
}
export function Heading({
  level = 2,
  children,
}: {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
}) {
  return h(`h${level}`, { className: "in-title" }, children);
}
export function Text({ children }: { children: ReactNode }) {
  return h("p", { className: "in-body" }, children);
}
export function Code({ children }: { children: ReactNode }) {
  return h("code", { className: "in-code" }, children);
}
export function CodeBlock({
  children,
  label = "Código",
}: {
  children: string;
  label?: string;
}) {
  return h(
    "pre",
    { className: "in-code-block", tabIndex: 0, "aria-label": label },
    h("code", null, children),
  );
}
export function InlineEdit({
  label,
  value,
  onSave,
  saveLabel = "Salvar",
  cancelLabel = "Cancelar",
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  saveLabel?: string;
  cancelLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const trigger = useRef<HTMLButtonElement>(null);
  function end() {
    setEditing(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  return editing
    ? h(
        "form",
        {
          className: "in-row",
          onSubmit: (e: FormEvent) => {
            e.preventDefault();
            onSave(draft);
            end();
          },
          onKeyDown: (e) => {
            if (e.key === "Escape") end();
          },
        },
        h(TextField, {
          label,
          value: draft,
          autoFocus: true,
          onChange: (e) => setDraft(e.target.value),
        }),
        h(Button, { type: "submit" }, saveLabel),
        h(Button, { variant: "text", onClick: end }, cancelLabel),
      )
    : h(
        "button",
        {
          ref: trigger,
          type: "button",
          className: "in-button in-button--ghost",
          "aria-label": `${label}: ${value}`,
          onClick: () => {
            setDraft(value);
            setEditing(true);
          },
        },
        value,
      );
}
export interface ChartPoint {
  label: string;
  value: number;
}
export function Chart({
  title,
  data,
  kind = "bar",
  labels = { series: "Série", value: "Valor", data: "dados" },
}: {
  title: string;
  data: ChartPoint[];
  kind?: "bar" | "line" | "pie";
  labels?: { series: string; value: string; data: string };
}) {
  const id = useId();
  const max = Math.max(
    1,
    ...data.map((d) => (Number.isFinite(d.value) ? Math.abs(d.value) : 0)),
  );
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0) || 1;
  let angle = -Math.PI / 2;
  return h(
    "figure",
    { className: "in-chart" },
    h("figcaption", { id }, title),
    h(
      "svg",
      { viewBox: "0 0 320 180", role: "img", "aria-labelledby": id },
      kind === "line"
        ? h("polyline", {
            points: data
              .map(
                (p, i) =>
                  `${20 + (i * 280) / Math.max(1, data.length - 1)},${150 - (p.value / max) * 120}`,
              )
              .join(" "),
            fill: "none",
            stroke: "var(--in-color-dataviz-categorical-01)",
            strokeWidth: 3,
          })
        : data.map((point, i) => {
            const color = `var(--in-color-dataviz-categorical-${String((i % 8) + 1).padStart(2, "0")})`;
            if (kind === "pie") {
              const start = angle;
              const sweep = (Math.max(0, point.value) / total) * Math.PI * 2;
              angle += sweep;
              if (sweep >= Math.PI * 2 - 0.0001)
                return h("circle", {
                  key: i,
                  cx: 160,
                  cy: 90,
                  r: 70,
                  fill: color,
                });
              return h("path", {
                key: i,
                d: `M160 90 L${160 + Math.cos(start) * 70} ${90 + Math.sin(start) * 70} A70 70 0 ${sweep > Math.PI ? 1 : 0} 1 ${160 + Math.cos(angle) * 70} ${90 + Math.sin(angle) * 70} Z`,
                fill: color,
              });
            }
            const height = (Math.max(0, point.value) / max) * 120;
            return h("rect", {
              key: i,
              x: 20 + (i * 280) / Math.max(1, data.length),
              y: 150 - height,
              width: Math.max(1, 240 / Math.max(1, data.length)),
              height,
              fill: color,
            });
          }),
    ),
    h(
      "table",
      { className: "in-table" },
      h("caption", null, `${title} — ${labels.data}`),
      h(
        "thead",
        null,
        h(
          "tr",
          null,
          h("th", { scope: "col" }, labels.series),
          h("th", { scope: "col" }, labels.value),
        ),
      ),
      h(
        "tbody",
        null,
        data.map((p, i) =>
          h(
            "tr",
            { key: i },
            h("th", { scope: "row" }, p.label),
            h("td", null, p.value),
          ),
        ),
      ),
    ),
  );
}
