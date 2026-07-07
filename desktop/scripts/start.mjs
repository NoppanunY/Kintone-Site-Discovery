import { spawn } from "node:child_process";
import process from "node:process";
import electronPath from "electron";

const electronBinary = typeof electronPath === "string" ? electronPath : String(electronPath);
const electronProcess = spawn(electronBinary, ["dist-desktop/desktop/main.cjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
  },
});

electronProcess.on("exit", (code) => {
  process.exit(code ?? 0);
});
