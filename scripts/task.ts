const task = process.argv[2];
if (task == null) throw new Error("A task must be specified!");

const env = task === "bench" ? "true" : "false";

await Bun.$`bun ${{
  raw: import.meta.dir + "/" + task + ".ts",
}} ${process.argv.slice(3)}`.env({ ...process.env, BENCHMARK: env });
