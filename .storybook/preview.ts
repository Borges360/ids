import { createElement as h } from "react";
import { InteiroProvider } from "../packages/react/src/index.ts";
import "../packages/tokens/dist/css/inteiro.css";
import "../packages/design-system/src/components.css";
import '../packages/composition/src/fonts.css';
export default {
  globalTypes: {
    theme: {
      description: "Tema",
      toolbar: { items: ["dark", "light", "contrast-dark", "contrast-light"] },
    },
    density: { toolbar: { items: ["calm", "focus"] } },
    direction: { toolbar: { items: ["ltr", "rtl"] } },
  },
  initialGlobals: { theme: "dark", density: "focus", direction: "ltr" },
  decorators: [
    (Story: any, context: any) =>
      h(InteiroProvider, {
        appearance: context.globals.theme,
        density: context.globals.density,
        children: h(
          "div",
          {
            dir: context.globals.direction,
            style: { padding: "var(--in-space-600)" },
          },
          h(Story),
        ),
      }),
  ],
  parameters: { a11y: { test: "error" }, controls: { expanded: true } },
};
