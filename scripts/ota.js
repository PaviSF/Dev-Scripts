#!/usr/bin/env node
const { execSync, exec } = require("child_process");
const { promisify } = require("util");
const readline = require("readline");

const execAsync = promisify(exec);

const args = process.argv.slice(2);

function parseArgs(args) {
  const result = { channels: [], versions: [], message: null };
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "-c" || arg === "--channel") {
      i++;
      while (i < args.length && !args[i].startsWith("-")) {
        result.channels.push(args[i++]);
      }
    } else if (arg === "-v" || arg === "--version") {
      i++;
      while (i < args.length && !args[i].startsWith("-")) {
        result.versions.push(args[i++]);
      }
    } else if (arg === "-m" || arg === "--message") {
      result.message = args[++i];
      i++;
    } else {
      i++;
    }
  }
  return result;
}

const { channels, versions, message: customMessage } = parseArgs(args);

if (channels.length === 0 || versions.length === 0) {
  console.log(
    "Usage: ota -c <channel...> -v <version...> [-m \"message\"]"
  );
  console.log("Example: ota -c staging -v 1.0.0 1.0.1");
  console.log("Example: ota -c staging production -v 1.0.0 -m \"fix crash\"");
  process.exit(1);
}

const platforms = ["android", "ios"];

const commitMessage = execSync("git log -1 --pretty=%B").toString().trim();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function updatePlatform(channel, version, platform, message) {
  const label = `[${channel}/${version}/${platform}]`;
  console.log(`  🚀 ${label} starting`);

  try {
    const { stdout, stderr } = await execAsync(
      `APP_VERSION=${version} eas update --channel ${channel} -p ${platform} -m "${message}"`,
      { maxBuffer: 1024 * 1024 * 10 }
    );

    if (stdout.trim()) console.log(`${label} ${stdout.trim()}`);
    if (stderr.trim()) console.error(`${label} ${stderr.trim()}`);
    console.log(`  ✅ ${label} done`);

    return { channel, version, platform, ok: true };
  } catch (error) {
    console.error(`  ❌ ${label} failed`);
    if (error.stdout?.trim()) console.log(`${label} ${error.stdout.trim()}`);
    if (error.stderr?.trim()) console.error(`${label} ${error.stderr.trim()}`);

    return { channel, version, platform, ok: false };
  }
}

async function run() {
  let finalMessage = customMessage;

  if (!finalMessage) {
    console.log(`\n📝 Last commit message: "${commitMessage}"`);
    const change = await ask("Do you want to change the update message? (y/N): ");
    if (change.toLowerCase() === "y") {
      finalMessage = await ask("Enter new update message: ");
    } else {
      finalMessage = commitMessage;
    }
  }

  console.log(`\n🚀 Channels: ${channels.join(", ")}`);
  console.log(`📦 Versions: ${versions.join(", ")}`);
  console.log(`📝 Message: ${finalMessage}\n`);

  const results = [];

  for (const channel of channels) {
    console.log(`\n📡 Channel: ${channel}`);

    for (const version of versions) {
      console.log(`\n  📦 Version ${version}`);

      const platformResults = await Promise.all(
        platforms.map((platform) =>
          updatePlatform(channel, version, platform, finalMessage)
        )
      );

      results.push(...platformResults);
    }
  }

  rl.close();

  const failures = results.filter((r) => !r.ok);
  if (failures.length > 0) {
    console.log(`\n❌ ${failures.length} update(s) failed:`);
    for (const f of failures) {
      console.log(`   - ${f.channel} / ${f.version} / ${f.platform}`);
    }
    process.exit(1);
  }

  console.log("\n🎉 All updates completed\n");
}

run();
