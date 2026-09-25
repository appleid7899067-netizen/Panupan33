import { spawn } from "node:child_process";

export type PythonServerResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
  exitCode: number;
  runtime: "python-server";
  error?: string;
};

function trimOutput(value: string, max = 50_000) {
  return value.length > max ? value.slice(0, max) + "\n[output truncated]" : value;
}

export async function runPythonServer(code: string, timeoutMs = 15_000): Promise<PythonServerResult> {
  const started = Date.now();
  const safeTimeout = Math.min(Math.max(Number(timeoutMs) || 15_000, 500), 30_000);

  return new Promise((resolve) => {
    let settled = false;
    let stdout = "";
    let stderr = "";

    const finish = (result: PythonServerResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const trySpawn = (command: string) => {
      const child = spawn(command, ["-I", "-c", code], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
        if (stdout.length > 60_000) child.kill("SIGKILL");
      });
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
        if (stderr.length > 60_000) child.kill("SIGKILL");
      });

      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        finish({
          ok: false,
          stdout: trimOutput(stdout),
          stderr: trimOutput(stderr || "Python execution timed out."),
          durationMs: Date.now() - started,
          exitCode: 124,
          runtime: "python-server",
          error: "PYTHON_TIMEOUT",
        });
      }, safeTimeout);

      child.on("error", (error) => {
        clearTimeout(timer);
        if (command === "python3") {
          trySpawn("python");
          return;
        }
        finish({
          ok: false,
          stdout: trimOutput(stdout),
          stderr: trimOutput(error.message),
          durationMs: Date.now() - started,
          exitCode: 127,
          runtime: "python-server",
          error: "PYTHON_RUNTIME_UNAVAILABLE",
        });
      });

      child.on("close", (exitCode) => {
        clearTimeout(timer);
        finish({
          ok: exitCode === 0,
          stdout: trimOutput(stdout),
          stderr: trimOutput(stderr),
          durationMs: Date.now() - started,
          exitCode: typeof exitCode === "number" ? exitCode : 1,
          runtime: "python-server",
          ...(exitCode === 0 ? {} : { error: "PYTHON_EXECUTION_FAILED" }),
        });
      });
    };

    trySpawn("python3");
  });
}
