import { describe, it, expect, vi } from "vitest";
import { Readable, Writable } from "node:stream";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, stat, rm, rmdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  SettingsSession,
  Navigation,
  Operation,
  OperationCancelled,
  WorkspaceModel,
  resolveBindings,
  keyAction,
  keyHints,
  safeText,
  cellWidth,
  truncate,
  wrap,
  detectCapabilities,
  requireInput,
  PanelController,
  TableModel,
  DataTable,
  LogModel,
  LogView,
  TERMINAL_COMPONENTS,
  getTerminalComponent,
  SettingsList,
  TerminalPanel,
  ActionBar,
  KeyHints,
  Select,
  MultiSelect,
  ConfirmAction,
  ChangeSummary,
  EmptyState,
} from "../../packages/terminal/src/index.ts";
import { runLinear } from "../../packages/terminal/src/linear.ts";
import { PiSettingsPanel, piBindings } from "../../packages/terminal/src/pi.ts";
import { getKeybindings } from "@earendil-works/pi-tui";
import { fields, defaults } from "../../examples/terminal/shared.ts";
import { validateSchema, DEFAULTS } from "@inteiro/contracts";
import { resolveContext } from "../../packages/agent-core/src/context.ts";
const session = () => new SettingsSession(fields, defaults);
const persist = async () => {};
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe("Terminal recovery and portable interaction regressions", () => {
  it("previews CLI arguments without writing and persists only with explicit --save", async () => {
    const directory = await mkdtemp(join(tmpdir(), "inteiro-terminal-args-")),
      config = join(directory, "preferences.json");
    try {
      const args = [
        "examples/terminal/standalone.ts",
        "--json",
        "--no-input",
        "--config",
        config,
        "--limit",
        "5",
      ];
      const preview = spawnSync(process.execPath, args, {
        encoding: "utf8",
        timeout: 10000,
      });
      expect(preview.status).toBe(0);
      expect(JSON.parse(preview.stdout).value.limit).toBe(5);
      await expect(stat(config)).rejects.toThrow();
      const save = spawnSync(process.execPath, [...args, "--save"], {
        encoding: "utf8",
        timeout: 10000,
      });
      expect(save.status).toBe(0);
      expect(JSON.parse(await readFile(config, "utf8")).limit).toBe(5);
      expect(save.stderr).toBe("");
    } finally {
      await rm(config, { force: true });
      await rmdir(directory);
    }
  });
  it("times out an uncooperative save and requires a fresh storage read before retry", async () => {
    const s = session();
    s.begin("limit");
    s.edit(5);
    s.confirmEdit();
    expect(
      (await s.save(async () => new Promise(() => {}), { timeoutMs: 10 }))
        .status,
    ).toBe("outcomeUnknown");
    expect((await s.save(persist)).status).toBe("invalid");
    expect(s.draft.limit).toBe(5);
    s.reconcilePersistence({ ...defaults, limit: 4 });
    expect(s.persisted.limit).toBe(4);
    expect(s.draft.limit).toBe(5);
    expect((await s.save(persist)).status).toBe("succeeded");
  });
  it("contains validator failures without losing draft or disclosing exception details", async () => {
    const s = new SettingsSession(
      [
        {
          id: "x",
          label: "X",
          description: "X",
          kind: "text",
          validate() {
            throw Error("private-data");
          },
        },
      ],
      { x: "old" },
    );
    s.begin("x");
    s.edit("new");
    expect((await s.save(persist)).status).toBe("invalid");
    expect(s.editing?.value).toBe("new");
    expect(JSON.stringify(s.errors)).not.toContain("private-data");
  });
  it("confirms cancellation only when the work acknowledges stopping", async () => {
    const op = new Operation("product", "external");
    const result = op.run(
      (signal) =>
        new Promise((_, reject) =>
          signal.addEventListener(
            "abort",
            () => reject(new OperationCancelled()),
            { once: true },
          ),
        ),
      1000,
    );
    op.cancel();
    expect((await result).status).toBe("cancelled");
  });
  it("does not translate a completed operation into cancelled merely because abort was requested", async () => {
    const op = new Operation("product");
    let complete!: (v: number) => void;
    const result = op.run(
      () =>
        new Promise<number>((r) => {
          complete = r;
        }),
      1000,
    );
    op.cancel();
    complete(5);
    expect((await result).status).toBe("succeeded");
  });
  it("ASCII changes decoration without rewriting Unicode user content", () => {
    const s = new SettingsSession(
      [{ id: "x", label: "Título", description: "Texto", kind: "text" }],
      { x: "a·b…界" },
    );
    const p = new PanelController({
      session: s,
      title: "Produto",
      scope: "projeto",
      persist,
      bindings: resolveBindings(),
    });
    const text = p.render(80, 24, true).lines.join("\n");
    expect(text).toContain("a·b…界");
    expect(text).toContain("projeto | Sem alterações");
  });
  it("help mode shows the focused description once (body only, not repeated in the footer)", async () => {
    const description =
      "Unique field description that only the help screen should print.";
    for (const locale of ["en", "pt-BR"]) {
      const s = new SettingsSession(
        [{ id: "x", label: "Field", description, kind: "text" }],
        { x: "a" },
      );
      const p = new PanelController({
        session: s,
        title: "Product",
        scope: "scope",
        persist,
        locale,
        presentation: "standard",
        bindings: resolveBindings(),
      });
      const count = () =>
        p.render(80, 40).lines.join("\n").split(description).length - 1;
      expect(count()).toBe(1);
      await p.dispatch("help");
      expect(p.help).toBe(true);
      expect(count()).toBe(1);
      p.dispose();
    }
  });
  it("search uses remapped actions and keeps typed help keys as data", async () => {
    const fields = Array.from({ length: 12 }, (_, i) => ({
      id: `f${i}`,
      label: `Campo ${i}`,
      kind: "text" as const,
      description: "Campo",
    }));
    const s = new SettingsSession(
      fields,
      Object.fromEntries(fields.map((f) => [f.id, "value"])),
    );
    const p = new PiSettingsPanel(
      {
        session: s,
        title: "T",
        scope: "S",
        persist,
        bindings: resolveBindings([
          { action: "search", key: "f3", label: "F3", scope: "navigation" },
          { action: "activate", key: "f2", label: "F2", scope: "panel" },
        ]),
      },
      { fg: (_name, text) => text },
      () => {},
      () => {},
      () => 24,
    );
    p.handleInput("\x1bOR");
    await p.drain();
    expect(p.controller.searchEditing).toBe(true);
    p.handleInput("Campo 11");
    p.handleInput("\x1bOQ");
    await p.drain();
    expect(p.controller.navigation.visible.map((f) => f.id)).toEqual(["f11"]);
    p.dispose();
  });
  it("provides the data workspace's sort, logs and complete linear records through keyboard actions", () => {
    const model = new WorkspaceModel({
      records: [
        { id: "z", label: "Z", fields: { name: "Z" } },
        { id: "a", label: "A", fields: { name: "A" } },
      ],
      columns: [{ id: "name", label: "Nome", priority: 0 }],
      logLimit: 2,
    });
    model.dispatch("nextRegion");
    model.dispatch("navigate.down");
    model.dispatch("activate");
    expect(model.mode).toBe("table");
    model.dispatch("navigate.down");
    model.dispatch("navigate.down");
    model.dispatch("activate");
    expect(model.table.rows[0]?.name).toBe("A");
    expect(model.linear().lines.join()).toContain("Registro 2");
    model.log.append("a\nb\nc");
    model.dispatch("navigate.down");
    model.dispatch("activate");
    expect(model.log.paused).toBe(true);
    expect(model.log.export()).toBe("b\nc");
  });
  it("returns actionable machine-readable usage errors without prompting", () => {
    const p = spawnSync(
      process.execPath,
      ["examples/terminal/standalone.ts", "--json", "--config"],
      { encoding: "utf8", timeout: 10000 },
    );
    expect(p.status).toBe(2);
    expect(JSON.parse(p.stdout).status).toBe("invalid");
    expect(p.stderr).toBe("");
  });
});
describe("TERM-01/02 opening, navigation and ownership", () => {
  it("opens synchronously with current values and scope without IO", () => {
    const s = session(),
      p = new PanelController({
        session: s,
        title: "Preferências",
        scope: "projeto",
        persist,
        bindings: resolveBindings(),
      });
    const text = p.render(80, 24).lines.join("\n");
    expect(text).toContain("projeto");
    expect(text).toContain("local");
    expect(s.dirty).toBe(false);
  });
  it("clamps navigation and restores focus/filter/position on return", () => {
    const n = new Navigation(
      "root",
      [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      "b",
    );
    n.move(1);
    expect(n.current.focusedId).toBe("b");
    n.move(-10);
    expect(n.current.focusedId).toBe("a");
    n.current.offset = 8;
    n.filter("A");
    n.current.offset = 2;
    n.enter("child");
    n.back();
    expect(n.current).toEqual({
      id: "root",
      focusedId: "a",
      filter: "A",
      offset: 2,
    });
  });
  it("navigating or escaping incomplete edit has no persistence", async () => {
    const s = session(),
      save = vi.fn(persist),
      p = new PanelController({
        session: s,
        title: "P",
        scope: "S",
        persist: save,
        bindings: resolveBindings(),
      });
    await p.dispatch("navigate.down");
    await p.dispatch("activate");
    s.edit("en");
    await p.dispatch("back");
    expect(s.draft).toEqual(defaults);
    expect(save).not.toHaveBeenCalled();
  });
  it("does not expose mutable snapshots or override ownership", () => {
    const s = new SettingsSession(
      [
        {
          id: "a",
          label: "A",
          description: "A",
          kind: "multiselect",
          choices: [{ id: "x", label: "X" }],
          override: { value: ["x"], source: "ambiente" },
        },
      ],
      { a: [] },
    );
    (s.effective.a as string[]).push("y");
    expect(s.effective.a).toEqual(["x"]);
    s.begin("a");
    expect(s.editing).toBeUndefined();
    expect(s.status).toContain("ambiente");
  });
});
describe("TERM-03/04 draft, validation, persistence and discard", () => {
  it("commits draft only, then saves editor before complete validation and stays open", async () => {
    const s = session();
    s.begin("limit");
    s.edit(5);
    expect(s.persisted.limit).toBe(3);
    expect(s.draft.limit).toBe(3);
    const save = vi.fn(async (v) => {
      expect(v.limit).toBe(5);
    });
    expect((await s.save(save)).status).toBe("succeeded");
    expect(s.persisted.limit).toBe(5);
    expect(s.closed).toBe(false);
    expect(s.dirty).toBe(false);
  });
  it("retains invalid editor and focuses error, never invokes storage", async () => {
    const s = session(),
      save = vi.fn(persist);
    s.begin("limit");
    s.edit(0);
    expect((await s.save(save)).status).toBe("invalid");
    expect(s.editing?.value).toBe(0);
    expect(s.focusedId).toBe("limit");
    expect(save).not.toHaveBeenCalled();
  });
  it("rejects invalid select values and types", () => {
    const s = session();
    s.begin("connection");
    s.edit("bad");
    expect(s.confirmEdit()).toBe(false);
    s.edit(3);
    expect(s.confirmEdit()).toBe(false);
  });
  it("preserves draft on save failure and guards dirty close with safe initial decision", async () => {
    const s = session();
    s.begin("limit");
    s.edit(4);
    s.confirmEdit();
    const result = await s.save(async () => {
      throw new Error("private details");
    });
    expect(result.status).toBe("failed");
    expect(s.draft.limit).toBe(4);
    expect(s.persisted.limit).toBe(3);
    expect(s.status).not.toContain("private");
    s.back();
    expect(s.closeDecision).toBe(true);
    s.back();
    expect(s.closed).toBe(false);
    s.back();
    await s.decide("discard", persist);
    expect(s.closed).toBe(true);
    expect(s.draft.limit).toBe(3);
  });
  it("prevents duplicate saves and ignores completion from a disposed session", async () => {
    const s = session();
    let finish!: () => void;
    const save = vi.fn(
      () =>
        new Promise<void>((r) => {
          finish = r;
        }),
    );
    const first = s.save(save);
    expect((await s.save(save)).status).toBe("invalid");
    s.dispose();
    finish();
    expect((await first).status).toBe("outcomeUnknown");
    expect(save).toHaveBeenCalledTimes(1);
    expect(s.status).toBe("");
  });
  it("safe default in dirty decision continues editing; save-close only closes on success", async () => {
    const s = session();
    s.begin("limit");
    s.edit(4);
    s.confirmEdit();
    s.back();
    await s.decide("saveClose", async () => {
      throw Error();
    });
    expect(s.closed).toBe(false);
    await s.decide("continue", persist);
    expect(s.closeDecision).toBe(false);
    s.back();
    await s.decide("saveClose", persist);
    expect(s.closed).toBe(true);
  });
  it("redacts secrets from summaries", () => {
    const s = new SettingsSession(
      [{ id: "secret", label: "Chave", kind: "secret", description: "Token" }],
      { secret: "old" },
    );
    s.begin("secret");
    s.edit("TOPSECRET");
    s.confirmEdit();
    expect(JSON.stringify(s.changes)).not.toContain("TOPSECRET");
    expect(SettingsList(s).lines.join()).not.toContain("TOPSECRET");
    expect(ChangeSummary(s.changes, "projeto").lines.join()).not.toContain(
      "TOPSECRET",
    );
  });
});
describe("TERM-05/06 semantic components and bindings", () => {
  it("distinguishes focus and selection and disabled reason without color", () => {
    const choices = [
      { id: "a", label: "A" },
      { id: "b", label: "B", disabled: "desconectado" },
    ];
    const text = Select("Escolha", choices, "b", "a").lines.join("\n");
    expect(text).toContain("  (x) A");
    expect(text).toContain("> ( ) B");
    expect(text).toContain("desconectado");
    expect(MultiSelect("X", choices, "b", ["a"]).lines.join()).toContain("[x]");
    expect(
      ConfirmAction("objeto", "remove", "lab", "Excluir").lines[3],
    ).toContain("> [Continuar");
  });
  it("derives dispatch and hints from remaps, respecting reserved keys and field text", () => {
    const bindings = resolveBindings(
      [{ action: "save", key: "f2", label: "F2", scope: "panel" }],
      ["ctrl+c"],
    );
    expect(keyAction("f2", bindings, "field")).toBe("save");
    expect(keyHints(bindings, { save: "salvar" })).toBe("F2 salvar");
    expect(keyAction("?", bindings, "field")).toBeUndefined();
    expect(keyAction("?", bindings, "navigation", true)).toBeUndefined();
    expect(bindings.some((b) => b.key === "ctrl+s")).toBe(false);
  });
  it("reaches save without Ctrl+S through action bar", async () => {
    const save = vi.fn(persist),
      p = new PanelController({
        session: session(),
        title: "P",
        scope: "S",
        persist: save,
        bindings: resolveBindings(),
      });
    await p.dispatch("nextRegion");
    await p.dispatch("activate");
    expect(save).toHaveBeenCalledOnce();
  });
  it("Ctrl+S confirms currently focused selection instead of previous value", async () => {
    const s = session(),
      p = new PanelController({
        session: s,
        title: "P",
        scope: "S",
        persist,
        bindings: resolveBindings([], [], true),
      });
    await p.dispatch("activate");
    await p.dispatch("navigate.down");
    await p.dispatch("save");
    expect(s.persisted.connection).toBe("lab");
  });
});
describe("TERM-07 operation lifecycle", () => {
  it("reports real denominator only and blocks duplicates", async () => {
    const op = new Operation<number>("panel"),
      work = vi.fn(async (_s, report) => {
        report("etapa", 1, 2);
        await tick();
        return 3;
      });
    const p = op.run(work, 2000);
    expect(op.percent).toBe(50);
    expect((await op.run(work, 1000)).status).toBe("invalid");
    expect(await p).toEqual({ status: "succeeded", value: 3 });
    expect(work).toHaveBeenCalledOnce();
  });
  it("distinguishes requested cancellation and unknown external outcome; requires reconciliation", async () => {
    const op = new Operation("panel", "external");
    const p = op.run(async () => new Promise(() => {}), 2000);
    op.cancel();
    expect(op.state).toBe("cancelling");
    expect((await p).status).toBe("outcomeUnknown");
    expect((await op.run(async () => 2, 100)).status).toBe("invalid");
    op.reconcile("succeeded", "Destino confirmou");
    expect(op.state).toBe("succeeded");
  });
  it("timeouts even a noncooperative operation and ignores late progress after disposal", async () => {
    const op = new Operation("session");
    let report!: (s: string) => void;
    const p = op.run(async (_signal, r) => {
      report = r;
      return new Promise(() => {});
    }, 20);
    expect((await p).status).toBe("outcomeUnknown");
    op.dispose();
    report("late");
    expect(op.progress.label).toBe("Iniciando");
  });
});
describe("TERM-08/09 geometry, graphemes and external controls", () => {
  for (const [columns, rows] of [
    [40, 12],
    [80, 24],
    [120, 36],
  ] as const)
    it(`${columns}x${rows} keeps focus and actions with draft intact`, () => {
      const s = session();
      s.begin("limit");
      s.edit(5);
      s.confirmEdit();
      const p = new PanelController({
        session: s,
        title: "Preferências",
        scope: "projeto",
        persist,
        bindings: resolveBindings(),
      });
      s.focusedId = "limit";
      const v = p.render(columns, rows);
      expect(v.lines.length).toBeLessThanOrEqual(rows);
      expect(v.lines.every((l) => cellWidth(l) <= columns)).toBe(true);
      expect(v.lines.join()).toContain("Salvar");
      expect(v.lines.join()).toContain("Fechar");
      expect(v.lines.join()).toContain("Limite de tarefas");
      expect(s.draft.limit).toBe(5);
    });
  it("retains full values when compact summary truncates and preserves content graphemes", () => {
    for (const t of ["café", "e\u0301", "界面", "👩‍💻", "🇧🇷"]) {
      expect(wrap(t.repeat(10), 4).every((l) => cellWidth(l) <= 4)).toBe(true);
      expect(cellWidth(truncate(t.repeat(10), 4))).toBeLessThanOrEqual(4);
    }
    expect(cellWidth("e\u0301")).toBe(1);
    expect(cellWidth("界")).toBe(2);
    expect(truncate("👩‍💻X", 2, "")).toBe("👩‍💻");
  });
  it("strips OSC clipboard/title, DCS, CSI, C1 and unfinished escape strings", () => {
    expect(
      safeText("A\x1b]52;c;SECRET\x07B\x1b[31mC\x1b[0m\x1bPpayload\x1b\\D"),
    ).toBe("ABCD");
    expect(safeText("X\x9d0;title\x9cY")).toBe("XY");
    expect(safeText("ok\x1b]52;c;open")).toBe("ok");
  });
  it("falls back below minimum geometry without losing draft", () => {
    const p = new PanelController({
      session: session(),
      title: "P",
      scope: "S",
      persist,
      bindings: resolveBindings(),
    });
    expect(p.render(30, 8).lines.join()).toContain("modo linear");
  });
});
describe("TERM-10 noninteractive streams and imports", () => {
  it.each([
    { noInput: true },
    { json: true },
    { env: { CI: "true" } },
    { inputTTY: false },
    { outputTTY: false },
  ])("does not prompt for %j", (extra) => {
    const c = detectCapabilities({
      inputTTY: true,
      outputTTY: true,
      uiTTY: true,
      ...extra,
    });
    expect(c.interactive).toBe(false);
    expect(c.screen).toBe(false);
    expect(requireInput(c, ["destino"])?.status).toBe("invalid");
  });
  it("NO_COLOR removes only colors, and linear can remain interactive", () => {
    const c = detectCapabilities({
      inputTTY: true,
      outputTTY: true,
      uiTTY: true,
      env: { NO_COLOR: "1", TERM: "xterm" },
      mode: "linear",
    });
    expect(c.color).toBe(false);
    expect(c.interactive).toBe(true);
    expect(c.screen).toBe(false);
  });
  it("standalone pipe emits exactly one JSON document and no ANSI or diagnostics", () => {
    const p = spawnSync(
      process.execPath,
      ["examples/terminal/standalone.ts", "--json"],
      { encoding: "utf8", timeout: 10000 },
    );
    expect(p.status).toBe(0);
    expect(p.stderr).toBe("");
    expect(JSON.parse(p.stdout).value).toEqual(defaults);
    expect(p.stdout).not.toContain("\x1b");
  });
  it("core import has no optional renderer or process side effects", () => {
    const p = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "await import('@inteiro/terminal');console.log(JSON.stringify({raw:!!process.stdin.isRaw,listeners:process.stdin.listenerCount('data')}))",
      ],
      { encoding: "utf8" },
    );
    expect(p.status).toBe(0);
    expect(JSON.parse(p.stdout)).toEqual({ raw: false, listeners: 0 });
    expect(p.stderr).toBe("");
  });
});
describe("TERM-11 host and cleanup", () => {
  it("uses actual Pi native Input and keeps paste as text; does not consume host interrupt", async () => {
    const s = new SettingsSession(
      [{ id: "a", label: "Nome", kind: "text", description: "Nome" }],
      { a: "" },
    );
    const done = vi.fn(),
      render = vi.fn();
    const p = new PiSettingsPanel(
      {
        session: s,
        title: "T",
        scope: "S",
        persist,
        bindings: piBindings(getKeybindings(), ["ctrl+c"]),
      },
      { fg: (_n, text) => text },
      render,
      done,
      () => 24,
      undefined,
      ["ctrl+c"],
    );
    p.handleInput("\r");
    await p.drain();
    p.handleInput("\x1b[200~?q\x1b[201~");
    p.handleInput("\r");
    await p.drain();
    expect(s.draft.a).toBe("?q");
    expect(p.controller.help).toBe(false);
    p.handleInput("\x03");
    expect(done).not.toHaveBeenCalled();
    p.dispose();
    expect(s.closed).toBe(false);
  });
  it("shows host key remaps from the same registry", () => {
    const keys = getKeybindings();
    const old = keys.getUserBindings();
    try {
      keys.setUserBindings({ ...old, "tui.select.up": ["ctrl+k"] });
      expect(
        piBindings(keys).find((b) => b.action === "navigate.up")?.key,
      ).toBe("ctrl+k");
    } finally {
      keys.setUserBindings(old);
    }
  });
});
describe("TERM-12 linear keyboard path (screen-reader review is separate evidence)", () => {
  it("completes edit/save/close as append-only numbered transcript", async () => {
    let text = "";
    const output = new Writable({
      write(chunk, _e, cb) {
        text += chunk;
        cb();
      },
    });
    const s = session(),
      save = vi.fn(persist);
    const c = detectCapabilities({
      inputTTY: true,
      outputTTY: true,
      uiTTY: true,
      mode: "linear",
    });
    const result = await runLinear({
      title: "Configurações",
      scope: "projeto",
      session: s,
      persist: save,
      capabilities: c,
      input: Readable.from(["3\n5\ns\n0\n"]),
      output,
    });
    expect(result.status).toBe("succeeded");
    expect(s.persisted.limit).toBe(5);
    expect(save).toHaveBeenCalledOnce();
    expect(text).not.toContain("\x1b");
    expect(text).toContain("Escolha uma opção");
  });
  it("EOF abandons edit without saving", async () => {
    const save = vi.fn(persist);
    const c = detectCapabilities({
      inputTTY: true,
      outputTTY: true,
      uiTTY: true,
    });
    const result = await runLinear({
      title: "X",
      scope: "Y",
      session: session(),
      persist: save,
      capabilities: c,
      input: Readable.from(["3\n"]),
      output: new Writable({
        write(_c, _e, cb) {
          cb();
        },
      }),
    });
    expect(result.status).toBe("cancelled");
    expect(save).not.toHaveBeenCalled();
  });
});
describe("Data patterns, catalogue, context and schemas", () => {
  it("sorts tables explicitly and exposes all columns in linear records", () => {
    const t = new TableModel(
      [{ id: "n", label: "Nome", priority: 1 }],
      [{ n: "Z" }, { n: "A" }],
    );
    t.order("n");
    expect(t.rows[0]?.n).toBe("A");
    expect(DataTable(t, 40).lines.join()).toContain("Nome: A");
    expect(DataTable(t, 80, true).lines.join()).toContain("Registro 2");
  });
  it("bounds logs, freezes paused view and exports undecorated sanitized text", () => {
    const l = new LogModel(2);
    l.append("a\nb");
    l.toggle();
    l.append("\x1b[31mc");
    expect(l.lines).toEqual(["a", "b"]);
    expect(l.export()).toBe("b\nc");
    expect(l.dropped).toBe(1);
    l.toggle();
    expect(l.lines).toEqual(["b", "c"]);
    expect(LogView(l).lines[0]).toContain("acompanhando");
  });
  it("publishes every concrete component with distinct terminal namespace and mandatory contracts", () => {
    expect(TERMINAL_COMPONENTS).toHaveLength(23);
    for (const c of TERMINAL_COMPONENTS) {
      expect(c.id).toMatch(/^terminal\./);
      expect(c.linear).toBeTruthy();
      expect(c.resize).toBeTruthy();
      expect(validateSchema("terminal-component", c).valid).toBe(true);
    }
    expect(getTerminalComponent("Select")).toHaveLength(2);
  });
  it("resolves terminal context without DOM requirements", async () => {
    const config = structuredClone(DEFAULTS);
    config.context.harness = "pi";
    const c = await resolveContext(
      {
        type: "component",
        surface: "terminal",
        description: "terminal settings",
      },
      process.cwd(),
      config,
    );
    expect(c.patterns.every((p) => p.id.startsWith("terminal."))).toBe(true);
    expect(c.identity.join()).not.toContain("data-in-theme");
    expect(c.requiredChecks).toContain("npm run test:terminal");
    expect(validateSchema("context-bundle", c).valid).toBe(true);
  });
});
