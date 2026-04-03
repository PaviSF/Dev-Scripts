#!/usr/bin/env node
const { execSync } = require("child_process");
const readline = require("readline");

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

  for (const channel of channels) {
    console.log(`\n📡 Channel: ${channel}`);

    for (const version of versions) {
      console.log(`\n  📦 Version ${version}`);

      for (const platform of platforms) {
        try {
          console.log(`  🚀 Updating ${platform}`);

          execSync(
            `APP_VERSION=${version} eas update --channel ${channel} -p ${platform} -m "${finalMessage}"`,
            { stdio: "inherit" }
          );

          console.log(`  ✅ ${platform} done`);
        } catch (error) {
          console.error(`  ❌ Failed for ${platform} on version ${version} in channel ${channel}`);
          process.exit(1);
        }
      }
    }
  }

  rl.close();
  console.log("\n🎉 All updates completed\n");
}

run();
