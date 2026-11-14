/**
 * Cross-references the declared pattern coverage map with executed case
 * results. A map (or an aggregate count) is a claim; each dimension it declares
 * must resolve to a named case that ran and passed in the same qualification.
 */
export interface ExecutedCase {
  key: string;
  status: "passed" | "failed" | "skipped";
}
interface CoverageRecord {
  patternId: string;
  states: string[];
  dimensions: {
    themes: string[];
    densities: string[];
    viewports: number[];
    content: string[];
    direction: string[];
    motion: string[];
    zoom: { method: string; factors: number[] };
    keyboard: { applicable: boolean; test?: string; reason?: string };
  };
  stateApplicability: Record<
    string,
    { applicable: boolean; test?: string; reason?: string }
  >;
  negative: { type: string; test: string };
}
export interface CoverageMatrix {
  schemaVersion: string;
  patterns: CoverageRecord[];
}
export interface StoryInventory {
  patternId: string;
  state: string;
}
export interface PatternCoverageEvidence {
  patterns: number;
  stories: number;
  expected: number;
  passed: number;
  notApplicable: number;
  missing: string[];
  errors: string[];
}

export const MAIN_SPEC = "tests/browser/composition.spec.ts";
export const ROBUSTNESS_SPEC = "tests/browser/composition-robustness.spec.ts";
export const STORIES_FILE = "stories/Patterns.stories.ts";

const words = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

/** Case titles are the contract between the specs and this cross-reference. */
export const caseTitles = {
  state: (
    id: string,
    state: string,
    width: number,
    theme: string,
    density: string,
  ) =>
    `${id} ${state} ${width} ${theme} ${density}: semantics, layout and accessibility`,
  content: (id: string) =>
    `empty optional strings, reduced motion and induced clipping: ${id}`,
  zoomRtl: (id: string) =>
    `native browser zoom 200%, RTL and long translation: ${id}`,
  robustZoom: (id: string) => `robust content and 200% zoom: ${id}`,
  story: (id: string, state: string) => `${words(id)} ${words(state)}`,
};

const caseKey = (file: string, title: string) => file + "::" + title + "::";

export function verifyPatternCoverage(
  matrix: CoverageMatrix,
  stories: StoryInventory[],
  executed: ExecutedCase[],
  fileExists: (path: string) => boolean,
): PatternCoverageEvidence {
  const errors: string[] = [];
  const expected = new Map<string, string>();
  const need = (file: string, title: string, why: string) =>
    expected.set(
      file === STORIES_FILE ? file + "::" + title : caseKey(file, title),
      why,
    );
  let notApplicable = 0;

  const declared = new Set(matrix.patterns.map((pattern) => pattern.patternId));
  if (declared.size !== matrix.patterns.length)
    errors.push("Duplicate pattern in the coverage map");
  const inventory = new Map<string, Set<string>>();
  for (const story of stories)
    inventory.set(
      story.patternId,
      (inventory.get(story.patternId) ?? new Set()).add(story.state),
    );
  for (const id of inventory.keys())
    if (!declared.has(id)) errors.push("Pattern absent from the map: " + id);

  for (const pattern of matrix.patterns) {
    const id = pattern.patternId;
    const known = inventory.get(id);
    if (!known) errors.push("Pattern absent from the story inventory: " + id);
    else if (
      known.size !== pattern.states.length ||
      pattern.states.some((state) => !known.has(state))
    )
      errors.push("States differ from the story inventory: " + id);
    const { dimensions } = pattern;
    for (const state of pattern.states) {
      need(STORIES_FILE, caseTitles.story(id, state), id + " story " + state);
      for (const width of dimensions.viewports)
        for (const theme of dimensions.themes)
          for (const density of dimensions.densities)
            need(
              MAIN_SPEC,
              caseTitles.state(id, state, width, theme, density),
              `${id} ${state} ${width}/${theme}/${density}`,
            );
    }
    // Each state is either executed by a named test or justified as N/A.
    for (const [state, applicability] of Object.entries(
      pattern.stateApplicability,
    )) {
      if (applicability.applicable) {
        if (!applicability.test || !fileExists(applicability.test))
          errors.push(`${id}/${state}: applicable without an existing test`);
        else if (applicability.test === ROBUSTNESS_SPEC)
          need(
            ROBUSTNESS_SPEC,
            caseTitles.content(id),
            `${id} ${state} interaction`,
          );
        else if (!pattern.states.includes(state))
          errors.push(`${id}/${state}: applicable but not a declared state`);
      } else if (!applicability.reason?.trim())
        errors.push(`${id}/${state}: N/A without a justification`);
      else notApplicable++;
    }
    if (
      dimensions.content.includes("empty-optional-strings") ||
      dimensions.motion.includes("reduce")
    )
      need(ROBUSTNESS_SPEC, caseTitles.content(id), id + " empty and motion");
    if (
      dimensions.content.includes("long-translated") ||
      dimensions.direction.includes("rtl") ||
      dimensions.zoom.factors.includes(2)
    ) {
      need(ROBUSTNESS_SPEC, caseTitles.zoomRtl(id), id + " zoom/RTL/long");
      need(MAIN_SPEC, caseTitles.robustZoom(id), id + " robust zoom");
    }
    if (dimensions.keyboard.applicable) {
      if (!dimensions.keyboard.test || !fileExists(dimensions.keyboard.test))
        errors.push(id + ": keyboard declared without an existing test");
      else
        need(
          ROBUSTNESS_SPEC,
          caseTitles.content(id),
          id + " keyboard and focus",
        );
    } else if (!dimensions.keyboard.reason?.trim()) {
      errors.push(id + ": keyboard N/A without a justification");
    } else notApplicable++;
    if (!pattern.negative?.test || !fileExists(pattern.negative.test))
      errors.push(id + ": controlled negative without an existing test");
    else
      need(ROBUSTNESS_SPEC, caseTitles.content(id), id + " negative control");
  }

  // Playwright keys end with the project name; vitest keys are file::name.
  const results = new Map<string, Set<string>>();
  const record = (key: string, status: string) =>
    results.set(key, (results.get(key) ?? new Set()).add(status));
  for (const value of executed) {
    record(value.key, value.status);
    if (!value.key.startsWith(STORIES_FILE + "::"))
      record(value.key.slice(0, value.key.lastIndexOf("::") + 2), value.status);
  }
  const missing: string[] = [];
  let passed = 0;
  const unique = new Set(expected.keys());
  for (const key of unique) {
    const statuses = results.get(key) ?? new Set<string>();
    if (statuses.has("failed")) missing.push("failed: " + key);
    else if (!statuses.has("passed")) missing.push("not executed: " + key);
    else passed++;
  }
  if (missing.length)
    errors.push(
      "Declared coverage without an executed passing case (" +
        missing.length +
        "): " +
        missing.slice(0, 5).join("; "),
    );
  return {
    patterns: matrix.patterns.length,
    stories: stories.length,
    expected: unique.size,
    passed,
    notApplicable,
    missing,
    errors,
  };
}
