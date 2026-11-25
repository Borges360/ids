/** Semantic roles of the IDS catalogue. Renderers in a host (Pi) use the host theme instead. */
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
