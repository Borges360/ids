import type { Locator } from "@playwright/test";

/** Rectangular viewport/overflow clipping; hit testing remains a separate assertion. */
export async function inspectTargetClipping(locator: Locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect(),
      view = element.ownerDocument.defaultView!;
    const box = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
    let left = 0,
      top = 0,
      right = view.innerWidth,
      bottom = view.innerHeight;
    const constraints: { tag: string; id: string; x: boolean; y: boolean }[] =
      [];
    let ancestor = element.parentElement;
    while (ancestor) {
      const style = view.getComputedStyle(ancestor),
        bounds = ancestor.getBoundingClientRect();
      const x = /^(hidden|clip|auto|scroll)$/.test(style.overflowX),
        y = /^(hidden|clip|auto|scroll)$/.test(style.overflowY);
      if (
        (x || y) &&
        bounds.width > 0 &&
        bounds.height > 0 &&
        style.display !== "contents"
      ) {
        const scaleX = ancestor.offsetWidth
          ? bounds.width / ancestor.offsetWidth
          : 1;
        const scaleY = ancestor.offsetHeight
          ? bounds.height / ancestor.offsetHeight
          : 1;
        const innerLeft = bounds.left + ancestor.clientLeft * scaleX,
          innerTop = bounds.top + ancestor.clientTop * scaleY;
        if (x) {
          left = Math.max(left, innerLeft);
          right = Math.min(right, innerLeft + ancestor.clientWidth * scaleX);
        }
        if (y) {
          top = Math.max(top, innerTop);
          bottom = Math.min(bottom, innerTop + ancestor.clientHeight * scaleY);
        }
        constraints.push({
          tag: ancestor.tagName.toLowerCase(),
          id: ancestor.id,
          x,
          y,
        });
      }
      const parent: HTMLElement | null = ancestor.parentElement;
      ancestor =
        parent ??
        (ancestor.getRootNode() instanceof ShadowRoot
          ? ((ancestor.getRootNode() as ShadowRoot).host as HTMLElement)
          : null);
    }
    const clipped =
      rect.left < left - 0.5 ||
      rect.top < top - 0.5 ||
      rect.right > right + 0.5 ||
      rect.bottom > bottom + 0.5;
    return {
      boundingBox: box,
      visibleBounds: { left, top, right, bottom },
      clipped,
      constraints,
    };
  });
}
