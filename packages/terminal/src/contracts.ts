/** Portable contract v1.0.0. No process, filesystem, host or renderer ownership. */
export const TERMINAL_CONTRACT_VERSION = "1.0.0" as const;
export type Value = string | number | boolean | string[];
export type Values = Record<string, Value>;
export type ActionId =
  | "navigate.up"
  | "navigate.down"
  | "navigate.first"
  | "navigate.last"
  | "navigate.pageUp"
  | "navigate.pageDown"
  | "activate"
  | "toggle"
  | "nextRegion"
  | "previousRegion"
  | "back"
  | "save"
  | "help"
  | "search"
  | "close"
  | "cancelOperation";
export type OperationState =
  | "idle"
  | "running"
  | "cancelling"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "outcomeUnknown";
export interface Choice {
  id: string;
  label: string;
  description?: string;
  disabled?: string;
}
export interface Field {
  id: string;
  label: string;
  description: string;
  kind: "text" | "secret" | "number" | "boolean" | "select" | "multiselect";
  choices?: Choice[];
  override?: { value: Value; source: string };
  validate?: (value: Value, draft: Readonly<Values>) => string | undefined;
}
export interface MenuItem extends Choice {
  kind: "value" | "route" | "action" | "status";
  value?: string;
  target?: string;
  effect?: "local" | "external" | "destructive";
}
export interface Capabilities {
  interactive: boolean;
  columns: number;
  rows: number;
  color: boolean;
  unicode: boolean;
  advancedKeyboard: boolean;
  mouse: boolean;
  screen: boolean;
  mode: "linear" | "prompts" | "panel" | "workspace" | "host" | "json";
  reducedMotion: boolean;
}
export interface Binding {
  action: ActionId;
  key: string;
  label: string;
  scope: "navigation" | "field" | "panel" | "operation";
}
export interface ComponentContract {
  id: string;
  version: "1.0.0";
  name: string;
  purpose: string;
  states: string[];
  actions: string[];
  focus: string;
  keyboard: string;
  linear: string;
  resize: string;
  requiredCapabilities: string[];
  tokens: string[];
  example: string;
}
export type TerminalResult<T> =
  | { status: "succeeded"; value: T }
  | {
      status: "failed" | "invalid" | "cancelled" | "outcomeUnknown";
      message: string;
    };
export const SEMANTIC_ROLES = {
  text: "color.text.primary",
  muted: "color.text.secondary",
  choose: "color.identity.primary",
  commit: "color.identity.commit",
  focus: "color.focus.ring",
  selection: "color.selection.background",
  success: "color.status.success",
  warning: "color.status.warning",
  danger: "color.status.danger",
  info: "color.status.info",
} as const;
