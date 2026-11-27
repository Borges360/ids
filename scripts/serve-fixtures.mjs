// Dedicated lifecycle and port: browser suites must not reuse a CLI-owned app.
process.env.PORT = process.env.INTEIRO_FIXTURE_PORT ?? "4178";
await import("./serve-demo.mjs");
