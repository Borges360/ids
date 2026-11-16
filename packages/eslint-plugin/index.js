const rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Usar tokens INTEIRO em estilos de componentes." },
    schema: [],
    messages: {
      literal: "Use um token semântico INTEIRO no lugar de cor literal.",
      unknown: "Variável CSS INTEIRO desconhecida: {{name}}.",
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== "string") return;
        const parent = node.parent;
        if (
          parent?.type === "Property" &&
          /^(color|background|backgroundColor|borderColor|fill|stroke)$/.test(
            parent.key.name ?? parent.key.value ?? "",
          ) &&
          /^#[\da-f]{3,8}$/i.test(node.value)
        )
          context.report({ node, messageId: "literal" });
      },
    };
  },
};
export default { rules: { "prefer-tokens": rule }, configs: {} };
