import { createBenchmarkServer } from "@inteiro/evaluation/grading";
const server = await createBenchmarkServer(process.cwd());
server.listen(4173, "127.0.0.1");
