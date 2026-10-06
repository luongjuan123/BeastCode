import { spawn } from "child_process";

const child = spawn("npx", ["tsx", "scripts/run-chat-tests.ts", ...process.argv.slice(2)], {
	stdio: "inherit",
	env: process.env,
});

child.on("exit", (code) => {
	process.exit(code ?? 0);
});
