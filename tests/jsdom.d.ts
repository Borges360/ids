// The repository uses jsdom only in tests and does not install @types/jsdom.
// Keep its dynamic DOM surface local to tests while preserving module typing.
declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string, options?: { url?: string });
    readonly window: any;
  }
}
