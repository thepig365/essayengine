import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: options.stdio ?? "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

function openUrl(url) {
  if (process.platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    return;
  }
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    return;
  }
  spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
}

async function ensureDependencies() {
  if (existsSync(join(projectRoot, "node_modules"))) return;

  console.log("Dependencies are missing. Running npm install first...");
  await run(npmCommand, ["install"]);
}

function warnAboutEnv() {
  if (existsSync(join(projectRoot, ".env.local"))) return;

  console.log("");
  console.log("Note: .env.local was not found.");
  console.log("The UI can still open, but engine calls need API keys such as OPENAI_API_KEY, DEEPSEEK_API_KEY, or QWEN_API_KEY.");
  console.log("Use .env.example as the template when adding keys.");
  console.log("");
}

async function main() {
  await ensureDependencies();
  warnAboutEnv();

  console.log("Starting Essay Engine UI...");
  console.log("A browser window will open when the local server is ready.");
  console.log("");

  const child = spawn(npmCommand, ["run", "dev", "--", "--hostname", "127.0.0.1"], {
    cwd: projectRoot,
    stdio: ["inherit", "pipe", "pipe"],
    shell: false,
  });

  let opened = false;
  const openWhenReady = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);

    if (opened) return;
    const match = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/);
    if (match) {
      opened = true;
      openUrl(match[0]);
    }
  };

  child.stdout.on("data", openWhenReady);
  child.stderr.on("data", openWhenReady);
  child.on("error", (err) => {
    console.error(`Failed to start Essay Engine UI: ${err.message}`);
    process.exitCode = 1;
  });
  child.on("exit", (code) => {
    process.exitCode = code ?? 0;
  });

  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
