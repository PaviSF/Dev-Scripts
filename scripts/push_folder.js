#!/usr/bin/env node
const { execSync, spawnSync } = require("child_process");
const readline = require("readline");

function checkTool(cmd, installHint) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
  } catch {
    console.error(`❌ "${cmd}" is required but was not found. ${installHint}`);
    process.exit(1);
  }
}

checkTool("rsync", "It ships with macOS/Linux by default.");
checkTool(
  "sshpass",
  "Install it, e.g. `brew install hudochenkov/sshpass/sshpass` on macOS, or `apt install sshpass` on Linux."
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

const ENTER_CODES = [10, 13];
const CTRL_C_CODE = 3;
const BACKSPACE_CODES = [8, 127];

function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);

    let input = "";
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (chunk) => {
      for (const ch of chunk.toString()) {
        const code = ch.charCodeAt(0);

        if (ENTER_CODES.includes(code)) {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(input);
          return;
        }

        if (code === CTRL_C_CODE) {
          process.stdout.write("\n");
          process.exit(1);
        }

        if (BACKSPACE_CODES.includes(code)) {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }

        input += ch;
        process.stdout.write("*");
      }
    };

    stdin.on("data", onData);
  });
}

async function run() {
  const username = await ask("Username: ");
  const password = await askHidden("Password: ");
  const host = await ask("Remote host (e.g. example.com or 192.168.1.10): ");
  const localPath = await ask("Local folder path: ");
  const remotePath = await ask("Remote folder path: ");

  const remoteTarget = `${username}@${host}:${remotePath}`;

  console.log("\nAbout to sync:");
  console.log(`  Local:  ${localPath}`);
  console.log(`  Remote: ${remoteTarget}\n`);

  const confirm = await ask("Proceed? (y/N): ");
  rl.close();

  if (confirm.toLowerCase() !== "y") {
    console.log("Aborted.");
    process.exit(0);
  }

  console.log("\n🚀 Syncing...\n");

  const result = spawnSync(
    "sshpass",
    [
      "-e",
      "rsync",
      "-avz",
      "-e",
      "ssh -o StrictHostKeyChecking=accept-new",
      localPath,
      remoteTarget,
    ],
    { stdio: "inherit", env: { ...process.env, SSHPASS: password } }
  );

  if (result.status !== 0) {
    console.error("\n❌ Sync failed");
    process.exit(result.status ?? 1);
  }

  console.log("\n✅ Done\n");
}

run();
