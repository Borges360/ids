import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { getKeybindings, visibleWidth } from "@earendil-works/pi-tui";
import {
  MESSAGES,
  Operation,
  OperationCancelled,
  PanelController,
  SettingsSession,
  WorkspaceModel,
  keyLabel,
  normalizeLocale,
  resolveBindings,
  resolveMessages,
  setCellWidthMeasure,
  getCellWidthMeasure,
  fallbackCellWidth,
  cellWidth,
  type Field,
  type PanelAction,
  type TerminalMessages,
  type Values,
} from "../../packages/terminal/src/index.ts";
import {
  PiSettingsPanel,
  openPiSettings,
  openPiWorkspace,
  piBindings,
  type PiTheme,
  type PiUI,
} from "../../packages/terminal/src/pi.ts";

const plain: PiTheme = { fg: (_n, text) => text };
const tagged: PiTheme = {
  fg: (name, text) => `<${name}>${text}</${name}>`,
  bold: (text) => `<b>${text}</b>`,
};
const KEY = {
  esc: "\x1b",
  enter: "\r",
  down: "\x1b[B",
  up: "\x1b[A",
  ctrlS: "\x13",
  tab: "\t",
};
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const fields: Field[] = [
  {
    id: "mode",
    label: "Mode",
    description: "Operating mode",
    kind: "select",
    choices: [
      { id: "auto", label: "Automatic" },
      { id: "off", label: "Disabled" },
    ],
  },
  { id: "enabled", label: "Enabled", description: "Switch", kind: "boolean" },
  {
    id: "limit",
    label: "Limit",
    description: "1..8",
    kind: "number",
    validate: (v) =>
      Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 8
        ? undefined
        : "Use 1 to 8.",
  },
];
const initial: Values = { mode: "auto", enabled: false, limit: 3 };
const session = (extra: Field[] = [], values: Values = {}) =>
  new SettingsSession([...fields, ...extra], { ...initial, ...values });
function panel(
  options: Partial<ConstructorParameters<typeof PanelController>[0]> & {
    session?: SettingsSession;
  } = {},
  theme: PiTheme = plain,
  rows = 24,
) {
  const done = vi.fn();
  const s = options.session ?? session();
  const p = new PiSettingsPanel(
    {
      title: "Product / Settings",
      scope: "project",
      persist: async () => {},
      locale: "en",
      presentation: "standard",
      discardOnSecondEscape: true,
      cancellableSave: true,
      ...options,
      session: s,
      bindings: piBindings(getKeybindings(), ["ctrl+c"], true, {
        locale: options.locale ?? "en",
      }),
    },
    theme,
    () => {},
    done,
    () => rows,
    undefined,
    ["ctrl+c"],
  );
  const press = async (...keys: string[]) => {
    for (const k of keys) {
      p.handleInput(k);
      await p.drain();
    }
  };
  return { p, s, done, press, text: (w = 80) => p.render(w).join("\n") };
}
function fakeUi(rows = 24) {
  const calls: { overlayOptions?: unknown }[] = [];
  let component: (PiSettingsPanel & { handleInput(d: string): void }) | any;
  const ui: PiUI = {
    custom(factory, options) {
      calls.push({ overlayOptions: options?.overlayOptions });
      return new Promise((resolveDone) => {
        component = factory(
          { requestRender() {}, terminal: { rows } },
          plain,
          getKeybindings(),
          (v) => resolveDone(v),
        );
      });
    },
  };
  return {
    ui,
    calls,
    async press(...keys: string[]) {
      for (const k of keys) {
        component.handleInput(k);
        if (component.drain) await component.drain();
        await tick();
      }
    },
    /** Input without waiting for the work it starts. */
    send: (k: string) => component.handleInput(k),
    render: (w = 80) => component.render(w) as string[],
  };
}

describe("1.4 i18n catalog", () => {
  it("ships complete EN and PT-BR catalogs without empty text", () => {
    const keys = (m: TerminalMessages) => Object.keys(m).sort();
    expect(keys(MESSAGES.en)).toEqual(keys(MESSAGES["pt-BR"]));
    for (const m of Object.values(MESSAGES))
      for (const [key, value] of Object.entries(m)) {
        const texts =
          typeof value === "string"
            ? [value]
            : typeof value === "function"
              ? [(value as (...a: unknown[]) => string)("x", 1, 2, 3)]
              : Object.values(value as Record<string, string>);
        for (const t of texts) expect(t.trim(), key).not.toBe("");
      }
  });
  it("defaults to pt-BR, maps unknown locales to English and ignores empty overrides", () => {
    expect(normalizeLocale()).toBe("pt-BR");
    expect(normalizeLocale("pt")).toBe("pt-BR");
    expect(normalizeLocale("fr-FR")).toBe("en");
    expect(normalizeLocale("")).toBe("en");
    const m = resolveMessages("en", {
      actionSave: "",
      actionHelp: "Assist",
      confirmRun: () => "",
      operationStates: { running: "", failed: "broken" },
    });
    expect(m.actionSave).toBe("Save changes");
    expect(m.actionHelp).toBe("Assist");
    expect(m.confirmRun("Test")).toBe("Run: Test");
    expect(m.operationStates.running).toBe("running");
    expect(m.operationStates.failed).toBe("broken");
  });
  it("renders the whole panel in English when asked, and in PT-BR by default", () => {
    const en = new PanelController({
      session: session(),
      title: "T",
      scope: "S",
      persist: async () => {},
      bindings: resolveBindings([], [], true, { locale: "en" }),
      locale: "en",
    }).render(80, 24).lines.join("\n");
    expect(en).toContain("Save changes");
    expect(en).toContain("No changes");
    expect(en).not.toMatch(/Salvar|Sem altera|Fechar|Ajuda/);
    const pt = new PanelController({
      session: session(),
      title: "T",
      scope: "S",
      persist: async () => {},
      bindings: resolveBindings(),
    }).render(80, 24).lines.join("\n");
    expect(pt).toContain("Salvar alterações");
  });
  it("labels host keys for people, not with host ids", () => {
    const m = resolveMessages("en");
    expect(keyLabel("pageDown", m)).toBe("PgDn");
    expect(keyLabel("pageUp", m)).toBe("PgUp");
    expect(keyLabel("escape", m)).toBe("Esc");
    expect(keyLabel("ctrl+s", m)).toBe("Ctrl+S");
    expect(keyLabel("up", m)).toBe("↑");
    expect(keyLabel("space", m)).toBe("Space");
    const labels = piBindings(getKeybindings(), ["ctrl+c"], true, {
      locale: "en",
    }).map((b) => b.label);
    for (const l of ["↑", "↓", "Enter", "Esc", "PgUp", "PgDn", "Ctrl+S"])
      expect(labels).toContain(l);
    expect(labels).not.toContain("escape");
    const { text } = panel();
    expect(text()).toContain("↑↓ navigate");
    expect(text()).toContain("Ctrl+S save");
    expect(text()).toContain("Esc close");
  });
  it("does not let a colliding host remap prevent the panel from opening", () => {
    const keys = getKeybindings();
    const old = keys.getUserBindings();
    try {
      keys.setUserBindings({ ...old, "tui.select.confirm": ["tab"] });
      const bindings = piBindings(keys);
      expect(bindings.find((b) => b.action === "activate")?.key).toBe("tab");
      expect(bindings.filter((b) => b.key === "tab")).toHaveLength(1);
    } finally {
      keys.setUserBindings(old);
    }
  });
});

describe("1.4 Esc, draft marker and colors", () => {
  it("first Esc warns, second Esc discards and closes without saving", async () => {
    const persist = vi.fn(async () => {});
    const { p, s, done, press, text } = panel({ persist });
    await press(KEY.down, KEY.enter);
    expect(s.draft.enabled).toBe(true);
    expect(text().split("\n")[0]).toBe("Product / Settings *");
    await press(KEY.esc);
    expect(s.closeDecision).toBe(true);
    expect(text()).toContain("Press Esc again to discard");
    expect(done).not.toHaveBeenCalled();
    await press(KEY.esc);
    expect(done).toHaveBeenCalledOnce();
    expect(s.draft).toEqual(initial);
    expect(persist).not.toHaveBeenCalled();
    p.dispose();
  });
  it("keeps the 1.3 decision behavior when the option is off", async () => {
    const { s, press } = panel({ discardOnSecondEscape: false });
    await press(KEY.down, KEY.enter, KEY.esc, KEY.esc);
    expect(s.closeDecision).toBe(false);
    expect(s.closed).toBe(false);
    expect(s.dirty).toBe(true);
  });
  it("Esc in a field returns without applying; Ctrl+S saves and stays open", async () => {
    const persist = vi.fn(async () => {});
    const { s, done, press, text } = panel({ persist });
    await press(KEY.down, KEY.down, KEY.enter, "7", KEY.esc);
    expect(s.draft.limit).toBe(3);
    expect(s.editing).toBeUndefined();
    await press(KEY.enter, "\x7f", "7", KEY.ctrlS);
    expect(persist).toHaveBeenCalledOnce();
    expect(s.persisted.limit).toBe(7);
    expect(done).not.toHaveBeenCalled();
    expect(text()).toContain("Changes saved.");
    expect(text().split("\n")[0]).toBe("Product / Settings");
  });
  it("colors errors by line role, not by a literal prefix", async () => {
    const extra: Field = {
      id: "note",
      label: "Erro: label text",
      description: "d",
      kind: "text",
    };
    const { press, p } = panel({ session: session([extra], { note: "" }) }, tagged);
    await press(KEY.down, KEY.down, KEY.enter, "\x7f", "0", KEY.enter);
    const lines = p.render(80);
    expect(lines.some((l) => l.startsWith("<error>") && l.includes("Error:"))).toBe(true);
    expect(lines.some((l) => l.includes("Erro: label text") && l.startsWith("<error>"))).toBe(false);
    expect(lines[0]).toMatch(/^<b>/);
  });
});

describe("1.4 width measure", () => {
  it("never renders a line wider than requested, measured by the host", async () => {
    expect(getCellWidthMeasure()).toBe(visibleWidth);
    const wide: Field[] = [
      {
        id: "long",
        label: "Rótulo 日本語 👩‍💻 ".repeat(6),
        description: "🇧🇷 ".repeat(40),
        kind: "text",
      },
      {
        id: "pick",
        label: "界".repeat(30),
        description: "x",
        kind: "select",
        choices: [{ id: "a", label: "❤️ ".repeat(50) }],
      },
    ];
    const s = new SettingsSession(wide, { long: "値".repeat(80), pick: "a" });
    const { p, press } = panel({ session: s });
    for (const step of [[], [KEY.enter], [KEY.esc, KEY.down, KEY.enter]]) {
      await press(...step);
      for (const width of [1, 10, 39, 40, 41, 57, 80, 121])
        for (const line of p.render(width))
          expect(visibleWidth(line), `${width}: ${line}`).toBeLessThanOrEqual(width);
    }
  });
  it("uses a dependency-free fallback and accepts an injected measure", () => {
    const previous = getCellWidthMeasure();
    try {
      setCellWidthMeasure(undefined);
      expect(cellWidth("界")).toBe(2);
      expect(cellWidth("e" + String.fromCodePoint(0x301))).toBe(1);
      expect(cellWidth("👩‍💻")).toBe(2);
      expect(fallbackCellWidth("🇧🇷")).toBe(2);
      setCellWidthMeasure(() => 42);
      expect(cellWidth("x")).toBe(42);
    } finally {
      setCellWidthMeasure(previous);
    }
  });
  it("keeps string-width out of the pi.ts import closure", () => {
    const root = resolve("packages/terminal/src");
    const seen = new Set<string>(),
      external = new Set<string>();
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      const source = readFileSync(file, "utf8");
      for (const [, spec] of source.matchAll(/from\s+"([^"]+)"/g)) {
        if (spec!.startsWith(".")) visit(join(dirname(file), spec!));
        else external.add(spec!);
      }
    };
    visit(join(root, "pi.ts"));
    expect([...external]).toEqual(["@earendil-works/pi-tui"]);
    expect([...seen].some((f) => /prompts|linear/.test(f))).toBe(false);
  });
});

describe("1.4 action rows, errors and cancellation", () => {
  const ok: PanelAction = {
    id: "check",
    label: "Check model",
    description: "Reads the local model",
    async run(_draft, signal, report) {
      report("Reading", 1, 2);
      await wait(5);
      signal.throwIfAborted();
      return "Model ready.";
    },
  };
  it("runs an action row with Enter and shows its final message", async () => {
    const { press, text } = panel({ actions: [ok] });
    await press(KEY.down, KEY.down, KEY.down);
    expect(text()).toContain("> Check model");
    expect(text()).toContain("Reads the local model");
    await press(KEY.enter);
    expect(text()).toContain("Model ready.");
  });
  it("Esc cancels a running action through its signal and keeps the panel usable", async () => {
    let seen: AbortSignal | undefined;
    const slow: PanelAction = {
      id: "slow",
      label: "Prepare",
      run: (_d, signal) =>
        new Promise((_, reject) => {
          seen = signal;
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    };
    const { p, s, press, text } = panel({ actions: [slow] });
    await press(KEY.down, KEY.down, KEY.down);
    p.handleInput(KEY.enter);
    await tick();
    expect(p.controller.busy).toBe(true);
    expect(text()).toContain("Esc cancel operation");
    await press(KEY.esc);
    expect(seen?.aborted).toBe(true);
    expect(p.controller.busy).toBe(false);
    expect(text()).toContain("Operation cancelled.");
    expect(s.closed).toBe(false);
  });
  it("asks for confirmation; Esc returns without running", async () => {
    const run = vi.fn(async () => "sent");
    const { press, text } = panel({
      actions: [{ id: "send", label: "Send test", confirm: "Sends audio to the provider.", run }],
    });
    await press(KEY.down, KEY.down, KEY.down, KEY.enter);
    expect(text()).toContain("Sends audio to the provider.");
    expect(text()).toContain("> [Go back]");
    await press(KEY.esc);
    expect(run).not.toHaveBeenCalled();
    await press(KEY.enter, KEY.down, KEY.enter);
    expect(run).toHaveBeenCalledOnce();
  });
  it("refuses an action that requires saved values while the draft is dirty", async () => {
    const run = vi.fn(async () => {});
    const { press, text } = panel({
      actions: [{ id: "a", label: "Apply", requiresSaved: true, run }],
    });
    await press(KEY.down, KEY.enter, KEY.down, KEY.down, KEY.enter);
    expect(run).not.toHaveBeenCalled();
    expect(text()).toContain("Save (Ctrl+S) or discard");
  });
  it("closes with an action and reports it to the caller", async () => {
    const f = fakeUi();
    const s = session();
    const result = openPiSettings(f.ui, {
      title: "T",
      scope: "S",
      session: s,
      persist: async () => {},
      signal: new AbortController().signal,
      locale: "en",
      reservedKeys: ["ctrl+c"],
      overlay: { width: "80%", maxHeight: 20 },
      actions: [
        { id: "start", label: "Start dictation", closeWith: true },
      ],
    });
    await tick();
    expect(f.calls[0]?.overlayOptions).toMatchObject({ width: "80%", maxHeight: 20 });
    expect(f.render().length).toBeLessThanOrEqual(20);
    await f.press(KEY.down, KEY.down, KEY.down, KEY.enter);
    expect(await result).toMatchObject({ status: "succeeded", action: "start", value: initial });
  });
  it("uses the product's error text and recovers from an unknown action outcome", async () => {
    let calls = 0;
    const flaky: PanelAction = {
      id: "push",
      label: "Upload",
      effect: "external",
      async run() {
        calls++;
        if (calls === 1) throw Object.assign(new Error("secret payload"), { code: "ECONNREFUSED" });
        return { message: "Uploaded." };
      },
    };
    const formatError = vi.fn((e: unknown) =>
      (e as { code?: string }).code === "ECONNREFUSED"
        ? "Connection refused by the local service. Start it and try again."
        : undefined,
    );
    const { press, text } = panel({ actions: [flaky], formatError });
    await press(KEY.down, KEY.down, KEY.down, KEY.enter);
    // external failure is not confirmed: the panel asks before repeating instead of locking
    expect(text()).toContain("Result not confirmed");
    expect(text()).not.toContain("secret payload");
    await press(KEY.enter);
    expect(text()).toContain("did not confirm its result");
    await press(KEY.down, KEY.enter);
    expect(text()).toContain("Uploaded.");
    const local = panel({
      actions: [{ id: "x", label: "X", async run() { throw Object.assign(new Error("raw"), { code: "ECONNREFUSED" }); } }],
      formatError,
    });
    await local.press(KEY.down, KEY.down, KEY.down, KEY.enter);
    expect(local.text()).toContain("Connection refused by the local service.");
    expect(formatError).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ phase: "action", id: "x" }));
  });
  it("treats an aborted signal, AbortError or code CANCELLED as cancellation", async () => {
    const local = new Operation("x", "local");
    const r1 = local.run(
      (signal) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(new Error("io closed")))),
      1000,
    );
    local.cancel();
    expect((await r1).status).toBe("cancelled");
    const external = new Operation("y", "external");
    const r2 = external.run(async () => { throw Object.assign(new Error(), { code: "CANCELLED" }); }, 1000);
    expect((await r2).status).toBe("cancelled");
    const r3 = new Operation("z", "external").run(async () => { throw new DOMException("x", "AbortError"); }, 1000);
    expect((await r3).status).toBe("outcomeUnknown");
    const named = new Operation("w", "external").run(async () => { throw new OperationCancelled(); }, 1000);
    expect((await named).status).toBe("cancelled");
  });
  it("honors a configurable cancellation grace", async () => {
    const op = new Operation("g", "local", { cancelGraceMs: 60 });
    const r = op.run(
      (signal) => new Promise((_, reject) => signal.addEventListener("abort", () => setTimeout(() => reject(new Error("late")), 30))),
      1000,
    );
    op.cancel();
    expect((await r).status).toBe("cancelled");
  });
});

describe("1.4 save cancellation, timeout and reconciliation", () => {
  it("Esc during save aborts the persist and keeps the draft retryable", async () => {
    let attempt = 0;
    const persist = vi.fn(
      (_v: Readonly<Values>, signal: AbortSignal) =>
        new Promise<void>((resolveSave, reject) => {
          attempt++;
          if (attempt > 1) return resolveSave();
          signal.addEventListener("abort", () => reject(new DOMException("stop", "AbortError")), { once: true });
        }),
    );
    const { p, s, press, text } = panel({ persist });
    await press(KEY.down, KEY.enter);
    p.handleInput(KEY.ctrlS);
    await tick();
    expect(s.saving).toBe(true);
    expect(text()).toContain("Esc cancel save");
    await press(KEY.esc);
    expect(s.saving).toBe(false);
    expect(s.outcomeUnknown).toBe(false);
    expect(s.draft.enabled).toBe(true);
    expect(text()).toContain("Save cancelled.");
    await press(KEY.ctrlS);
    expect(s.persisted.enabled).toBe(true);
  });
  it("applies saveTimeoutMs and lets the user reconcile an unconfirmed save", async () => {
    const reconcile = vi.fn(async () => ({ ...initial, enabled: true }));
    const { p, s, press, text } = panel({
      persist: () => new Promise<void>(() => {}),
      saveTimeoutMs: 20,
      cancelGraceMs: 5,
      reconcile,
    });
    await press(KEY.down, KEY.enter, KEY.ctrlS);
    expect(s.outcomeUnknown).toBe(true);
    expect(text()).toContain("Save was not confirmed");
    expect(text()).toContain("[Check storage]");
    await press(KEY.ctrlS);
    expect(reconcile).toHaveBeenCalledOnce();
    expect(s.outcomeUnknown).toBe(false);
    expect(s.dirty).toBe(false);
    expect(p.controller.session.status).toContain("Storage checked");
  });
  it("never traps the user after an unconfirmed save without reconcile", async () => {
    const { s, done, press } = panel({
      persist: () => new Promise<void>(() => {}),
      saveTimeoutMs: 10,
      cancelGraceMs: 1,
    });
    await press(KEY.down, KEY.enter, KEY.ctrlS);
    expect(s.outcomeUnknown).toBe(true);
    await press(KEY.esc, KEY.esc);
    expect(done).toHaveBeenCalledOnce();
  });
  it("formats storage errors with the product hook", async () => {
    const { s, press, text } = panel({
      persist: async () => {
        throw Object.assign(new Error("EACCES /home/user/.secret"), { code: "EACCES" });
      },
      formatError: (_e, ctx) => (ctx.phase === "save" ? "Settings file is read-only. Fix its permissions and save again." : undefined),
    });
    await press(KEY.down, KEY.enter, KEY.ctrlS);
    expect(text()).toContain("Settings file is read-only.");
    expect(text()).not.toContain(".secret");
    expect(s.dirty).toBe(true);
  });
});

describe("1.4 values, choices, preview and geometry", () => {
  it("shows choice labels, toggles booleans with one Enter and shows sources", async () => {
    const extra: Field[] = [
      { id: "budget", label: "Budget", description: "d", kind: "number", format: (v) => `$${Number(v).toFixed(2)}` },
      { id: "policy", label: "Policy", description: "d", kind: "text", locked: { source: "global policy" } },
      { id: "model", label: "Model", description: "d", kind: "text", override: { value: "tiny", source: "PI_VOICE_MODEL" } },
    ];
    const { s, press, text } = panel({ session: session(extra, { budget: 5, policy: "strict", model: "base" }) });
    expect(text()).toContain("Automatic");
    expect(text()).toContain("off");
    expect(text()).toContain("$5.00");
    expect(text()).toContain("[locked: global policy]");
    expect(text()).toContain("[source: PI_VOICE_MODEL]");
    await press(KEY.down, KEY.enter);
    expect(s.draft.enabled).toBe(true);
    expect(s.editing).toBeUndefined();
    expect(text()).toMatch(/Enabled\s+on/);
    await press(KEY.down, KEY.down, KEY.down, KEY.enter);
    expect(s.editing).toBeUndefined();
    expect(text()).toContain("Locked by global policy");
  });
  it("loads dynamic choices only when the field is activated, cancellably", async () => {
    let release!: (c: { id: string; label: string }[]) => void;
    const loadChoices = vi.fn(
      (signal: AbortSignal) =>
        new Promise<{ id: string; label: string }[]>((r, reject) => {
          release = r;
          signal.addEventListener("abort", () => reject(new DOMException("x", "AbortError")), { once: true });
        }),
    );
    const mic: Field = { id: "mic", label: "Microphone", description: "Input device", kind: "select", loadChoices };
    const { p, s, press, text } = panel({ session: session([mic], { mic: "default" }) });
    expect(loadChoices).not.toHaveBeenCalled();
    text();
    expect(s.validate()).toBe(true);
    await press(KEY.down, KEY.down, KEY.down);
    p.handleInput(KEY.enter);
    await tick();
    expect(loadChoices).toHaveBeenCalledOnce();
    await press(KEY.esc);
    expect(p.controller.busy).toBe(false);
    expect(s.editing).toBeUndefined();
    p.handleInput(KEY.enter);
    await tick();
    release([
      { id: "default", label: "System default" },
      { id: "usb", label: "USB mic" },
    ]);
    await p.drain();
    expect(s.editing?.id).toBe("mic");
    await press(KEY.down, KEY.enter, KEY.ctrlS);
    expect(s.persisted.mic).toBe("usb");
    expect(text()).toContain("USB mic");
  });
  it("previews the UI language from the draft and reverts it on discard", async () => {
    const lang: Field = {
      id: "uiLocale",
      label: "Language",
      description: "Interface language",
      kind: "select",
      choices: [
        { id: "en", label: "English" },
        { id: "pt-BR", label: "Português" },
      ],
    };
    const changes: string[] = [];
    const { s, done, press, text } = panel({
      session: session([lang], { uiLocale: "en" }),
      onDraftChange: (draft, event, controller) => {
        changes.push(`${event.reason}:${draft.uiLocale}`);
        controller.setLocale(String(draft.uiLocale));
      },
    });
    expect(text()).toContain("Save changes");
    await press(KEY.down, KEY.down, KEY.down, KEY.enter, KEY.down, KEY.enter);
    expect(s.draft.uiLocale).toBe("pt-BR");
    expect(text()).toContain("Salvar alterações");
    expect(text()).toContain("Esc fechar");
    await press(KEY.esc, KEY.esc);
    expect(done).toHaveBeenCalledOnce();
    expect(changes).toEqual(["edit:pt-BR", "discard:en"]);
  });
  it("shows a useful localized message below 40x12 instead of an inert button", () => {
    const { p } = panel();
    const small = p.render(30).join("\n");
    const tiny = panel({}, plain, 8).p.render(60).join("\n");
    for (const t of [small, tiny]) {
      expect(t).toContain("Terminal too small");
      expect(t).not.toContain("[Linear mode]");
      expect(t).not.toContain("[Modo linear]");
    }
  });
  it("keeps typed text visible when the label wraps", async () => {
    const long: Field = {
      id: "path",
      label: "Destination folder for the generated transcripts and logs",
      description: "d",
      kind: "text",
    };
    const { p, press } = panel({ session: session([long], { path: "" }) });
    await press(KEY.down, KEY.down, KEY.down, KEY.enter, "typed-value");
    for (const width of [40, 45, 80])
      expect(p.render(width).join("\n")).toContain("typed-value");
  });
  it("parametrizes the workspace title, scope and language", async () => {
    const model = new WorkspaceModel({
      records: [{ id: "a", label: "Check", fields: { Result: "OK" } }],
      columns: [{ id: "Result", label: "Result", priority: 0 }],
      title: "Voice / Doctor",
      scope: "local Whisper",
      locale: "en",
    });
    const text = model.render(80, 24).lines.join("\n");
    expect(text).toContain("Voice / Doctor");
    expect(text).toContain("local Whisper");
    expect(text).toContain("[Results]");
    expect(text).not.toContain("Diagnóstico");
    const ui: PiUI = {
      custom(factory) {
        return new Promise((r) => {
          const c = factory({ requestRender() {}, terminal: { rows: 24 } }, plain, getKeybindings(), r);
          const lines = c.render(80);
          expect(lines.join("\n")).toContain("Esc close");
          c.handleInput?.(KEY.esc);
        });
      },
    };
    await openPiWorkspace(ui, model, new AbortController().signal, { locale: "en" });
    expect(model.closed).toBe(true);
  });
});

describe("1.4 review fixes", () => {
  it("ignores a result that arrives after Esc cancelled a closeWith action", async () => {
    let seen: AbortSignal | undefined;
    const late: PanelAction = {
      id: "pick",
      label: "Pick device",
      closeWith: true,
      run: (_d, signal) => {
        seen = signal;
        return new Promise((r) => setTimeout(() => r({ value: "late-device" }), 30));
      },
    };
    const { p, s, done, press, text } = panel({ actions: [late] });
    await press(KEY.down, KEY.down, KEY.down);
    p.handleInput(KEY.enter);
    await tick();
    await press(KEY.esc);
    expect(seen?.aborted).toBe(true);
    expect(p.controller.closedWith).toBeUndefined();
    expect(s.closed).toBe(false);
    expect(done).not.toHaveBeenCalled();
    expect(text()).toContain("Pick device finished before the cancellation took effect");
    // the closing action did not leak into the Pi result either
    const f = fakeUi();
    const result = openPiSettings(f.ui, {
      title: "T",
      scope: "S",
      session: session(),
      persist: async () => {},
      signal: new AbortController().signal,
      actions: [late],
    });
    await tick();
    await f.press(KEY.down, KEY.down, KEY.down);
    f.send(KEY.enter);
    await tick();
    await f.press(KEY.esc);
    await wait(40);
    expect(f.render().join(" ")).toContain("finished before the cancellation");
    await f.press(KEY.esc);
    const r = await result;
    expect(r.status).toBe("succeeded");
    expect(r).not.toHaveProperty("action");
    expect(r).not.toHaveProperty("actionValue");
  });
  it("flags a value that resolved after abort without changing the 1.3 outcome", async () => {
    const lateValue = (signal: AbortSignal) =>
      new Promise<string>((r) => {
        signal.addEventListener("abort", () => setTimeout(() => r("late"), 5), { once: true });
      });
    const op = new Operation<string>("l", "local");
    const r1 = op.run(lateValue, 1000);
    op.cancel();
    expect(await r1).toMatchObject({ status: "succeeded", value: "late" });
    expect(op.cancelRequested).toBe(true);
    expect(await op.run(async () => "now", 1000)).toMatchObject({ status: "succeeded" });
    expect(op.cancelRequested).toBe(false);
    const timed = new Operation<string>("t", "local");
    await timed.run(lateValue, 5);
    expect(timed.cancelRequested).toBe(true);
  });
  it("does not open the submenu with choices that arrive after Esc", async () => {
    const loadChoices = vi.fn(
      () =>
        new Promise<{ id: string; label: string }[]>((r) =>
          setTimeout(() => r([{ id: "late", label: "LATE" }]), 20),
        ),
    );
    const mic: Field = { id: "mic", label: "Microphone", description: "d", kind: "select", loadChoices };
    const { p, s, press, text } = panel({ session: session([mic], { mic: "default" }) });
    await press(KEY.down, KEY.down, KEY.down);
    p.handleInput(KEY.enter);
    await tick();
    expect(text()).toContain("Loading options for Microphone");
    await press(KEY.esc);
    await wait(30);
    expect(s.editing).toBeUndefined();
    expect(text()).not.toContain("LATE");
  });
  it("offers an explicit retry after an unconfirmed save without reconcile", async () => {
    let calls = 0;
    const persist = vi.fn(
      () =>
        new Promise<void>((r) => {
          calls++;
          // the first write ignores the abort and takes longer than the grace period
          setTimeout(r, calls === 1 ? 40 : 0);
        }),
    );
    const { p, s, done, press, text } = panel({ persist, cancelGraceMs: 5 });
    await press(KEY.down, KEY.enter);
    p.handleInput(KEY.ctrlS);
    await tick();
    await press(KEY.esc);
    expect(s.outcomeUnknown).toBe(true);
    await wait(50);
    await press(KEY.ctrlS);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(text()).toContain("previous save was not confirmed");
    expect(text()).toContain("> [Go back]");
    await press(KEY.esc);
    expect(s.outcomeUnknown).toBe(true);
    await press(KEY.ctrlS, KEY.down, KEY.enter);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(s.outcomeUnknown).toBe(false);
    expect(s.persisted.enabled).toBe(true);
    expect(done).not.toHaveBeenCalled();
  });
  it("retries Save and close after an unconfirmed save without reconcile", async () => {
    let calls = 0;
    const persist = vi.fn(
      () => new Promise<void>((r) => setTimeout(r, ++calls === 1 ? 40 : 0)),
    );
    const { p, s, done, press } = panel({ persist, cancelGraceMs: 5 });
    await press(KEY.down, KEY.enter);
    p.handleInput(KEY.ctrlS);
    await tick();
    await press(KEY.esc);
    await wait(50);
    await press(KEY.esc, KEY.down, KEY.enter);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(p.controller.confirm).toBeDefined();
    await press(KEY.down, KEY.enter);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(s.persisted.enabled).toBe(true);
    expect(done).toHaveBeenCalledOnce();
  });
  it("clears a validation error when the field edit is abandoned with Esc", async () => {
    const { s, press, text } = panel();
    await press(KEY.down, KEY.down, KEY.enter, "\x7f", "9", KEY.enter);
    expect(s.errors.limit).toBe("Use 1 to 8.");
    await press(KEY.esc);
    expect(s.draft.limit).toBe(3);
    expect(s.errors).toEqual({});
    expect(text()).not.toContain("Use 1 to 8.");
  });
  it("drops the saved status once the draft changes again", async () => {
    const { s, press, text } = panel();
    await press(KEY.down, KEY.enter, KEY.ctrlS);
    expect(text()).toContain("Changes saved.");
    await press(KEY.enter);
    expect(s.dirty).toBe(true);
    expect(text()).not.toContain("Changes saved.");
  });
  it("opens the Pi panel and workspace in English unless a locale is chosen", async () => {
    const f = fakeUi();
    const result = openPiSettings(f.ui, {
      title: "T",
      scope: "S",
      session: session(),
      persist: async () => {},
      signal: new AbortController().signal,
    });
    await tick();
    const en = f.render().join("\n");
    expect(en).toContain("Save changes");
    expect(en).not.toMatch(/Salvar|Sem altera|desligado/);
    await f.press(KEY.esc);
    await result;
    const g = fakeUi();
    const pt = openPiSettings(g.ui, {
      title: "T",
      scope: "S",
      session: new SettingsSession(fields, initial, { locale: "pt-BR" }),
      persist: async () => {},
      signal: new AbortController().signal,
    });
    await tick();
    expect(g.render().join("\n")).toContain("Salvar alterações");
    await g.press(KEY.esc);
    await pt;
    const model = new WorkspaceModel({
      records: [{ id: "a", label: "Check", fields: { Result: "OK" } }],
      columns: [{ id: "Result", label: "Result", priority: 0 }],
    });
    const w = fakeUi();
    const opened = openPiWorkspace(w.ui, model, new AbortController().signal);
    await tick();
    const ws = w.render().join("\n");
    expect(ws).toContain("Esc close");
    expect(ws).not.toContain("Diagnóstico");
    await w.press(KEY.esc);
    await opened;
  });
  it("keeps an explicit narrow mode on the workspace and words the resize message without a draft", async () => {
    const records = [{ id: "a", label: "Check", fields: { Result: "OK" } }];
    const columns = [{ id: "Result", label: "Result", priority: 0 }];
    const linear = new WorkspaceModel({ records, columns, narrow: "linear", locale: "en" });
    const a = fakeUi();
    const o1 = openPiWorkspace(a.ui, linear, new AbortController().signal, { locale: "en" });
    await tick();
    expect(linear.narrow).toBe("linear");
    expect(a.render(30).join("\n")).not.toContain("Terminal too small");
    await a.press(KEY.esc);
    await o1;
    const fresh = new WorkspaceModel({ records, columns, locale: "en" });
    const b = fakeUi();
    const o2 = openPiWorkspace(b.ui, fresh, new AbortController().signal, { locale: "en" });
    await tick();
    const small = b.render(30).join("\n");
    expect(fresh.narrow).toBe("resize");
    expect(small).toContain("Terminal too small");
    expect(small).not.toMatch(/draft/i);
    await b.press(KEY.esc);
    await o2;
    const forced = new WorkspaceModel({ records, columns, locale: "en" });
    const c = fakeUi();
    const o3 = openPiWorkspace(c.ui, forced, new AbortController().signal, { locale: "en", narrow: "linear" });
    await tick();
    expect(forced.narrow).toBe("linear");
    await c.press(KEY.esc);
    await o3;
  });
  it("wraps long text at spaces in the standard presentation", async () => {
    const text =
      "The previous run did not confirm its result. Check the destination before running it again.";
    const { p, press } = panel({
      actions: [{ id: "x", label: "Send", confirm: text, run: async () => "ok" }],
    });
    await press(KEY.down, KEY.down, KEY.down, KEY.enter);
    for (let width = 40; width <= 100; width++) {
      const rendered = p.render(width).join("\n");
      for (const word of text.split(" ")) expect(rendered, `${width}`).toContain(word);
    }
    // a word longer than the width is still split (never dropped)
    const { p: q, press: pressQ } = panel({
      actions: [{ id: "y", label: "Send", confirm: "x".repeat(50), run: async () => "ok" }],
    });
    await pressQ(KEY.down, KEY.down, KEY.down, KEY.enter);
    expect(q.render(40).join("").replace(/[^x]/g, "").length).toBeGreaterThanOrEqual(50);
  });
});

describe("1.4 fallback width corpus", () => {
  // Pinned widths of the dependency-free measure (used outside Pi). Differences from
  // string-width 7.2.0 are intentional and listed in packages/terminal/CHANGELOG.md.
  const corpus: [string, number][] = [
    ["abc", 3],
    ["界", 2],
    ["ｱ", 1],
    ["Ａ", 2],
    ["©", 1],
    ["®", 1],
    ["™", 1],
    ["‼", 1],
    ["ℹ", 1],
    ["↔", 1],
    ["❤️", 2],
    ["👩‍💻", 2],
    ["🇧🇷", 2],
    ["1️⃣", 2],
    ["#⃣", 2],
    ["a⃣", 1],
    ["é", 1],
    ["؀", 0],
    ["ᅟ", 0],
    ["ᅠ", 0],
    ["ㅤ", 0],
    ["ﾠ", 0],
    [" ", 0],
    ["​", 0],
    ["한", 2],
  ];
  for (const [text, width] of corpus)
    it(`measures U+${[...text].map((c) => c.codePointAt(0)!.toString(16).padStart(4, "0")).join(" U+")} as ${width}`, () => {
      expect(fallbackCellWidth(text)).toBe(width);
    });
});
