import { InteiroProvider, inteiroTheme } from "@inteiro/react";

export function App() {
  return (
    <InteiroProvider appearance="auto" density="focus">
      <button
        className="in-button in-button--primary"
        style={{ paddingInline: inteiroTheme.space[400], borderRadius: inteiroTheme.radius.md }}
      >
        Revisar mudanças
      </button>
    </InteiroProvider>
  );
}
