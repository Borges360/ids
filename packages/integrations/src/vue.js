/** Plugin Vue: aplica data-in-theme / data-in-density no root. */
export const InteiroVue = {
  install(app, options = {}) {
    app.provide("inteiro", {
      appearance: options.appearance ?? "auto",
      density: options.density ?? "focus"
    });
  }
};
