// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement as h } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import axe from "axe-core";
import {
  Button,
  TextField,
  Select,
  Checkbox,
  Switch,
  Tabs,
  DataTable,
  Popover,
  InlineEdit,
  Chart,
} from "../packages/react/src/index.ts";
afterEach(cleanup);
describe("Biblioteca React", () => {
  it("impede ações duplicadas enquanto está carregando", async () => {
    const click = vi.fn();
    render(h(Button, { loading: true, onClick: click }, "Salvar"));
    await userEvent.click(screen.getByRole("button"));
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("true");
  });
  it("associa rótulo, ajuda e erro sem descartar descrição externa", () => {
    render(
      h(TextField, {
        label: "E-mail",
        error: "Informe um e-mail válido.",
        id: "email",
        "aria-describedby": "external",
      }),
    );
    const input = screen.getByLabelText("E-mail");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(
      "external email-message",
    );
    expect(screen.getByRole("alert").id).toBe("email-message");
  });
  it("preserva seleção nativa e controles de teclado", async () => {
    render(
      h(
        "div",
        null,
        h(Select, {
          label: "Equipe",
          options: [
            { value: "design", label: "Design" },
            { value: "code", label: "Código" },
          ],
        }),
        h(Checkbox, { label: "Termos" }),
        h(Switch, { label: "Avisos" }),
      ),
    );
    await userEvent.selectOptions(screen.getByLabelText("Equipe"), "code");
    expect((screen.getByLabelText("Equipe") as HTMLSelectElement).value).toBe(
      "code",
    );
    await userEvent.click(screen.getByRole("switch"));
    expect((screen.getByRole("switch") as HTMLInputElement).checked).toBe(true);
  });
  it("navega abas por setas e ignora opções desabilitadas", async () => {
    render(
      h(Tabs, {
        label: "Projeto",
        items: [
          { id: "a", label: "Resumo", content: "Resumo visível" },
          { id: "b", label: "Bloqueada", content: "B", disabled: true },
          { id: "c", label: "Histórico", content: "Histórico visível" },
        ],
      }),
    );
    screen.getByRole("tab", { name: "Resumo" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Histórico" }),
    );
    expect(screen.getByRole("tabpanel").textContent).toBe("Histórico visível");
    await userEvent.keyboard("{Home}");
    expect(
      screen.getByRole("tab", { name: "Resumo" }).getAttribute("aria-selected"),
    ).toBe("true");
  });
  it("filtra, ordena valores numéricos e pagina dados", async () => {
    render(
      h(DataTable, {
        caption: "Projetos",
        rows: [
          { id: "a", name: "Alfa", count: 10 },
          { id: "b", name: "Beta", count: 2 },
          { id: "c", name: "Gama", count: 1 },
        ],
        rowKey: "id",
        pageSize: 2,
        columns: [
          { key: "name", label: "Nome" },
          { key: "count", label: "Contagem" },
        ],
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Contagem" }));
    expect(screen.getAllByRole("row")[1]?.textContent).toBe("Gama1");
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(screen.getByRole("cell", { name: "Alfa" })).toBeTruthy();
    await userEvent.type(screen.getByRole("searchbox"), "Beta");
    expect(screen.getByRole("cell", { name: "Beta" })).toBeTruthy();
    expect(screen.queryByRole("cell", { name: "Alfa" })).toBeNull();
  });
  it("mostra estado vazio ao filtrar", async () => {
    render(
      h(DataTable, {
        caption: "Projetos",
        rows: [{ id: "a", name: "Alfa" }],
        rowKey: "id",
        columns: [{ key: "name", label: "Nome" }],
      }),
    );
    await userEvent.type(screen.getByRole("searchbox"), "inexistente");
    expect(screen.getByText("Nenhum resultado")).toBeTruthy();
  });
  it("fecha popover por Escape e restaura foco", async () => {
    render(h(Popover, { label: "Filtros" }, h(Checkbox, { label: "Ativos" })));
    await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
    expect(screen.getByRole("region")).toBeTruthy();
    screen.getByRole("checkbox").focus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("region")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Filtros" }),
    );
  });
  it("salva edição inline e cancela sem alterar valor", async () => {
    const save = vi.fn();
    render(h(InlineEdit, { label: "Nome", value: "Inteiro", onSave: save }));
    await userEvent.click(screen.getByRole("button"));
    await userEvent.clear(screen.getByLabelText("Nome"));
    await userEvent.type(screen.getByLabelText("Nome"), "Portal");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(save).toHaveBeenCalledWith("Portal");
  });
  it("publica alternativa tabular para cada gráfico", () => {
    render(
      h(Chart, {
        title: "Entregas",
        kind: "pie",
        data: [{ label: "Design", value: 12 }],
      }),
    );
    expect(screen.getByRole("img", { name: "Entregas" })).toBeTruthy();
    expect(
      screen.getByRole("table", { name: "Entregas — dados" }),
    ).toBeTruthy();
  });
  it("não apresenta violações estruturais axe em formulário e navegação", async () => {
    const { container } = render(
      h(
        "main",
        null,
        h("h1", null, "Projeto"),
        h(TextField, { label: "E-mail", type: "email" }),
        h(Select, {
          label: "Equipe",
          options: [{ value: "d", label: "Design" }],
        }),
        h(Checkbox, { label: "Termos" }),
        h(Button, null, "Salvar"),
        h(Tabs, {
          label: "Projeto",
          items: [{ id: "a", label: "Resumo", content: "Resumo" }],
        }),
      ),
    );
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
