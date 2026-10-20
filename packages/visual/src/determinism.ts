import type { BrowserContext } from "@playwright/test";
import { hash } from "@inteiro/contracts";

export const RANDOM_PROFILE = "math-random-lcg32-v1";

/** Old fixtures receive a stable seed derived from their complete public payload. */
export function fixtureRandomSeed(fixture: {
  seed?: number | undefined;
  clock?: string;
  responses?: unknown[];
}): number {
  if (fixture.seed === undefined)
    return Number.parseInt(hash(fixture).slice(0, 8), 16);
  if (
    !Number.isInteger(fixture.seed) ||
    fixture.seed < 0 ||
    fixture.seed > 0xffffffff
  )
    throw Error("Fixture seed must be an unsigned 32-bit integer");
  return fixture.seed;
}

/** Installed before page scripts in every document/frame; cryptographic APIs stay native. */
export async function installFixtureRandom(
  context: BrowserContext,
  seed: number,
) {
  fixtureRandomSeed({ seed });
  await context.addInitScript((initial: number) => {
    let value = initial >>> 0;
    Math.random = () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }, seed);
}
