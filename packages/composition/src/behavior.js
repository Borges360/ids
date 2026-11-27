/** Native HTML is the portable implementation. This optional enhancement returns cleanup. */
export function enhance(root = document) {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const openers = new WeakMap();
  root.querySelectorAll("[data-in-tooltip]").forEach((container) => {
    container.addEventListener(
      "mouseenter",
      () => delete container.dataset.inDismissed,
      options,
    );
    container.addEventListener(
      "focusin",
      (event) => {
        if (!container.contains(event.relatedTarget))
          delete container.dataset.inDismissed;
      },
      options,
    );
    container.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape" || container.dataset.inDismissed === "true")
          return;
        const tooltip = container.querySelector('[role="tooltip"]');
        if (!tooltip || getComputedStyle(tooltip).display === "none") return;
        container.dataset.inDismissed = "true";
        // Dismiss the innermost overlay; a later Escape can close its parent.
        event.preventDefault();
        event.stopPropagation();
      },
      options,
    );
  });
  root.querySelectorAll("dialog[data-in-auto-modal]").forEach((dialog) => {
    if (dialog.open) return;
    const trigger = dialog.id
      ? root.querySelector(`[data-in-open="${CSS.escape(dialog.id)}"]`)
      : null;
    if (trigger && !trigger.disabled) {
      openers.set(dialog, trigger);
      trigger.focus();
    }
    dialog.showModal();
  });
  const pages = new WeakMap();
  const updateTable = (container, page = 0) => {
    const rows = [...container.querySelectorAll("tbody tr")],
      size = Math.max(1, Number(container.dataset.inPageSize) || 10),
      last = Math.max(0, Math.ceil(rows.length / size) - 1);
    page = Math.min(last, Math.max(0, page));
    pages.set(container, page);
    rows.forEach((row, index) => {
      row.hidden = index < page * size || index >= (page + 1) * size;
    });
    const status = container.querySelector("[data-in-page-status]");
    if (status) status.textContent = `${page + 1} / ${last + 1}`;
    container.querySelectorAll("[data-in-page]").forEach((button) => {
      button.disabled =
        Number(button.dataset.inPage) < 0 ? page === 0 : page === last;
    });
  };
  root
    .querySelectorAll("[data-in-table]")
    .forEach((container) => updateTable(container));
  root.querySelectorAll("[data-in-auto-open]").forEach((element) => {
    if (element.matches(":popover-open")) return;
    const trigger = element.id
      ? root.querySelector(`[popovertarget="${CSS.escape(element.id)}"]`)
      : null;
    if (trigger && !trigger.disabled) trigger.focus();
    element.showPopover?.();
  });
  root.addEventListener(
    "click",
    (event) => {
      const sort = event.target.closest("[data-in-sort]");
      if (sort) {
        const container = sort.closest("[data-in-table]");
        if (container) {
          const body = container.querySelector("tbody"),
            th = sort.closest("th"),
            ascending = th.getAttribute("aria-sort") !== "ascending",
            column = Number(sort.dataset.inSort),
            collator = new Intl.Collator(document.documentElement.lang, {
              numeric: true,
              sensitivity: "base",
            });
          const rows = [...body.rows].sort(
            (a, b) =>
              collator.compare(
                a.cells[column]?.textContent ?? "",
                b.cells[column]?.textContent ?? "",
              ) * (ascending ? 1 : -1),
          );
          container
            .querySelectorAll("th[aria-sort]")
            .forEach((th) => th.setAttribute("aria-sort", "none"));
          th.setAttribute("aria-sort", ascending ? "ascending" : "descending");
          body.replaceChildren(...rows);
          updateTable(container);
        }
      }
      const page = event.target.closest("[data-in-page]");
      if (page) {
        const container = page.closest("[data-in-table]");
        if (container)
          updateTable(
            container,
            (pages.get(container) ?? 0) + Number(page.dataset.inPage),
          );
      }
      const trigger = event.target.closest("[data-in-open]");
      if (trigger) {
        const target = root.querySelector(
          "#" + CSS.escape(trigger.dataset.inOpen),
        );
        if (!target) return;
        if (target instanceof HTMLDialogElement) {
          if (!target.open) {
            openers.set(target, trigger);
            target.showModal();
          }
        } else {
          target.hidden = !target.hidden;
          trigger.setAttribute("aria-expanded", String(!target.hidden));
        }
      }
      const close = event.target.closest("[data-in-close]");
      if (close) close.closest("dialog")?.close();
    },
    options,
  );
  root.addEventListener(
    "close",
    (event) => {
      const opener = openers.get(event.target);
      openers.delete(event.target);
      if (opener?.isConnected) opener.focus();
    },
    {
      ...options,
      capture: true,
    },
  );
  root.addEventListener(
    "submit",
    (event) => {
      if (
        event.target.matches("[data-in-validate]") &&
        !event.target.checkValidity()
      ) {
        event.preventDefault();
        event.target.querySelector(":invalid")?.focus();
      }
    },
    { ...options, capture: true },
  );
  root.addEventListener(
    "keydown",
    (event) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        const details = event.target.closest("details[open]");
        if (!details || !root.contains(details)) return;
        // Native top-layer overlays inside a disclosure consume Escape first.
        const modal = event.target.closest("dialog[open]");
        if (
          (modal && details.contains(modal)) ||
          details.querySelector(":popover-open")
        )
          return;
        details.open = false;
        details.querySelector(":scope > summary")?.focus();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const tab = event.target.closest("[role=tab]");
      if (
        !tab ||
        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
      )
        return;
      const tabs = [
        ...tab.closest("[role=tablist]").querySelectorAll("[role=tab]"),
      ];
      const rtl = getComputedStyle(tab).direction === "rtl";
      const delta = (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
      const index =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabs.length - 1
            : (tabs.indexOf(tab) + delta + tabs.length) % tabs.length;
      event.preventDefault();
      tabs.forEach((t, i) => {
        t.tabIndex = i === index ? 0 : -1;
        t.setAttribute("aria-selected", String(i === index));
        const panel = root.querySelector(
          "#" + CSS.escape(t.getAttribute("aria-controls")),
        );
        if (panel) panel.hidden = i !== index;
      });
      tabs[index].focus();
    },
    options,
  );
  return () => controller.abort();
}
