import { spawn } from "node:child_process";
import process from "node:process";
import { createServer } from "vite";
import electronPath from "electron";

const host = "127.0.0.1";
const port = Number(process.env.KSD_RENDERER_PORT ?? 5173);

const server = await createServer({
  server: {
    host,
    port,
    strictPort: false,
  },
});

await server.listen();

const rendererUrl = server.resolvedUrls?.local?.[0] ?? `http://${host}:${port}/`;
const electronBinary = typeof electronPath === "string" ? electronPath : String(electronPath);
const electronProcess = spawn(electronBinary, ["dist-desktop/desktop/main.cjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    KSD_RENDERER_URL: rendererUrl,
    NODE_ENV: "development",
  },
});

const shutdown = async (exitCode = 0) => {
  await server.close();
  process.exit(exitCode);
};

electronProcess.on("exit", (code) => {
  void shutdown(code ?? 0);
});

process.on("SIGINT", () => {
  electronProcess.kill("SIGINT");
});

process.on("SIGTERM", () => {
  electronProcess.kill("SIGTERM");
});
