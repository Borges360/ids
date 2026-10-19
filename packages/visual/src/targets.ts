import type { Page } from "@playwright/test";

export interface InteractionTarget {
  tag: string;
  id: string;
  name: string;
  width: number;
  height: number;
  targetWidth: number;
  targetHeight: number;
  undersized: boolean;
}

/** INTEIRO's 44px control policy, separate from axe/WCAG exceptions.
 * Inline prose links are excluded; navigation links and explicit controls are checked.
 * A visible associated label may supply a radio/checkbox's clickable region.
 * This measures target dimensions, not occlusion or keyboard reachability.
 */
export async function inspectInteractionTargets(
  page: Page,
): Promise<InteractionTarget[]> {
  return page
    .locator(
      'button,input:not([type="hidden"]),select,textarea,summary,[role="button"],[role="tab"],nav a[href]',
    )
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        const visible = (node: Element) => {
          const style = getComputedStyle(node);
          const box = node.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.height > 0 &&
            style.visibility !== "hidden" &&
            style.visibility !== "collapse" &&
            style.display !== "none" &&
            style.opacity !== "0"
          );
        };
        if (
          !visible(element) ||
          element.closest('[hidden],[inert],[aria-hidden="true"]')
        )
          return [];
        let target = rect;
        if (
          element instanceof HTMLInputElement &&
          ["checkbox", "radio"].includes(element.type)
        ) {
          // Do not combine disjoint rectangles into a fictitious larger target.
          const labels = Array.from(element.labels ?? []).filter(visible);
          const label = labels.find((label) => {
            const box = label.getBoundingClientRect();
            return box.width >= 44 && box.height >= 44;
          });
          if (label) target = label.getBoundingClientRect();
        }
        const label =
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
            ? element.labels?.[0]?.textContent
            : undefined;
        return [
          {
            tag: element.tagName.toLowerCase(),
            id: element.id,
            name: (
              element.getAttribute("aria-label") ||
              label ||
              element.textContent ||
              ""
            )
              .trim()
              .slice(0, 160),
            width: rect.width,
            height: rect.height,
            targetWidth: target.width,
            targetHeight: target.height,
            // Allow only subpixel rounding, not a density-dependent smaller target.
            undersized: target.width < 43.99 || target.height < 43.99,
          },
        ];
      }),
    );
}
