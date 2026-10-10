/** Contrato alinhado ao exemplo do documento. Valores via CSS variables. */
export const inteiroTheme = {
  space: {
    100: "var(--in-space-100)",
    200: "var(--in-space-200)",
    400: "var(--in-space-400)",
    600: "var(--in-space-600)"
  },
  radius: {
    sm: "var(--in-radius-sm)",
    md: "var(--in-radius-md)",
    lg: "var(--in-radius-lg)",
    full: "var(--in-radius-full)"
  },
  motion: {
    snap: "var(--in-motion-snap)",
    fast: "var(--in-motion-fast)",
    normal: "var(--in-motion-normal)",
    deliberate: "var(--in-motion-deliberate)"
  },
  color: {
    background: {
      canvas: "var(--in-color-background-canvas)",
      surface: "var(--in-color-background-surface)",
      raised: "var(--in-color-background-raised)"
    },
    text: {
      primary: "var(--in-color-text-primary)",
      secondary: "var(--in-color-text-secondary)"
    },
    identity: {
      primary: "var(--in-color-identity-primary)",
      commit: "var(--in-color-identity-commit)"
    }
  }
} as const;

export type InteiroTheme = typeof inteiroTheme;
