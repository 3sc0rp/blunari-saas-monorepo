#!/usr/bin/env node

/**
 * 🔧 GitHub Secrets Setup Script
 *
 * This script helps configure all required GitHub secrets for the CI/CD pipeline.
 * Run this script to interactively set up your deployment secrets.
 */

const { execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Required secrets configuration
const secrets = [
  {
    name: "FLY_API_TOKEN",
    description: "Fly.io API token for backend deployment",
    command: "flyctl auth token",
    sensitive: true,
  },
  {
    name: "VERCEL_TOKEN",
    description: "Vercel API token",
    command: "vercel whoami --token YOUR_TOKEN",
    sensitive: true,
  },
  {
    name: "VERCEL_ORG_ID",
    description: "Vercel organization ID",
    command: "vercel teams list",
    sensitive: false,
  },
  {
    name: "VERCEL_ADMIN_PROJECT_ID",
    description: "Vercel project ID for admin dashboard",
    command: "cd apps/admin-dashboard && vercel project list",
    sensitive: false,
  },
  {
    name: "VERCEL_CLIENT_PROJECT_ID",
    description: "Vercel project ID for client dashboard",
    command: "cd apps/client-dashboard && vercel project list",
    sensitive: false,
  },
  {
    name: "VITE_BACKGROUND_OPS_URL",
    description: "Production API URL (e.g., https://services.blunari.ai)",
    command: null,
    sensitive: false,
  },
  {
    name: "VITE_BACKGROUND_OPS_API_KEY",
    description: "API key for background operations service",
    command: null,
    sensitive: true,
  },
  {
    name: "VITE_SUPABASE_URL",
    description: "Supabase project URL",
    command: null,
    sensitive: false,
  },
  {
    name: "VITE_SUPABASE_ANON_KEY",
    description: "Supabase anonymous key",
    command: null,
    sensitive: true,
  },
  {
    name: "SLACK_WEBHOOK",
    description: "Slack webhook URL for notifications (optional)",
    command: null,
    sensitive: true,
    optional: true,
  },
];

function log(message, color = "reset") {
  console.log(colors[color] + message + colors.reset);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(colors.cyan + prompt + colors.reset, resolve);
  });
}

function executeCommand(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

function checkGitHubCLI() {
  try {
    execSync("gh --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function checkRepositoryAuth() {
  try {
    const result = execSync("gh repo view --json name", {
      encoding: "utf8",
      stdio: "pipe",
    });
    return JSON.parse(result).name;
  } catch {
    return null;
  }
}

async function setGitHubSecret(name, value) {
  try {
    execSync(`gh secret set ${name}`, {
      input: value,
      encoding: "utf8",
      stdio: "pipe",
    });
    log(`✅ Secret ${name} set successfully`, "green");
    return true;
  } catch (error) {
    log(`❌ Failed to set ${name}: ${error.message}`, "red");
    return false;
  }
}

async function main() {
  log("🚀 Blunari SAAS CI/CD Secrets Setup", "bright");
  log("=====================================\n", "bright");

  // Check prerequisites
  log("🔍 Checking prerequisites...", "yellow");

  if (!checkGitHubCLI()) {
    log("❌ GitHub CLI not found. Please install it first:", "red");
    log("   https://cli.github.com/", "blue");
    process.exit(1);
  }

  const repoName = checkRepositoryAuth();
  if (!repoName) {
    log("❌ Not authenticated with GitHub or not in a repository.", "red");
    log("   Run: gh auth login", "blue");
    process.exit(1);
  }

  log(`✅ Repository: ${repoName}`, "green");
  log("✅ GitHub CLI authenticated\n", "green");

  // Collect secrets
  const secretValues = {};

  log("📝 Please provide the following secrets:", "bright");
  log("(Press Enter to skip optional secrets)\n");

  for (const secret of secrets) {
    log(`\n🔑 ${secret.name}`, "magenta");
    log(`   ${secret.description}`, "cyan");

    if (secret.command) {
      log(
        `   💡 Get it with: ${colors.yellow}${secret.command}${colors.reset}`,
      );
    }

    if (secret.optional) {
      log("   ⚠️  This secret is optional", "yellow");
    }

    const value = await question(`   Enter value: `);

    if (value.trim() === "" && secret.optional) {
      log("   ⏭️  Skipped (optional)", "yellow");
      continue;
    }

    if (value.trim() === "" && !secret.optional) {
      log("   ❌ Required secret cannot be empty", "red");
      process.exit(1);
    }

    secretValues[secret.name] = value.trim();

    if (secret.sensitive) {
      log("   ✅ Value saved (hidden)", "green");
    } else {
      log(`   ✅ Value saved: ${value.trim()}`, "green");
    }
  }

  // Confirm before setting
  log("\n🎯 Ready to set the following secrets:", "bright");
  Object.keys(secretValues).forEach((name) => {
    const secret = secrets.find((s) => s.name === name);
    if (secret.sensitive) {
      log(`   ${name}: ****** (hidden)`, "cyan");
    } else {
      log(`   ${name}: ${secretValues[name]}`, "cyan");
    }
  });

  const confirm = await question(
    "\n❓ Proceed with setting these secrets? (y/N): ",
  );

  if (confirm.toLowerCase() !== "y" && confirm.toLowerCase() !== "yes") {
    log("❌ Cancelled by user", "yellow");
    process.exit(0);
  }

  // Set secrets
  log("\n🚀 Setting GitHub secrets...", "bright");
  let successCount = 0;

  for (const [name, value] of Object.entries(secretValues)) {
    const success = await setGitHubSecret(name, value);
    if (success) successCount++;
  }

  // Summary
  log("\n📊 Setup Summary:", "bright");
  log(`   ✅ ${successCount} secrets set successfully`);
  log(`   ❌ ${Object.keys(secretValues).length - successCount} failures`);

  if (successCount === Object.keys(secretValues).length) {
    log("\n🎉 All secrets configured successfully!", "green");
    log("Your CI/CD pipeline is ready to use.", "green");

    // Generate environment template
    log("\n📄 Generating local .env template...", "yellow");
    const envTemplate = Object.keys(secretValues)
      .filter((name) => name.startsWith("VITE_"))
      .map((name) => `${name}=your_${name.toLowerCase()}_here`)
      .join("\n");

    if (envTemplate) {
      fs.writeFileSync(".env.example", envTemplate);
      log("✅ Created .env.example file", "green");
    }
  } else {
    log("\n⚠️  Some secrets failed to set. Check the errors above.", "yellow");
    process.exit(1);
  }

  rl.close();
}

// Handle errors gracefully
process.on("SIGINT", () => {
  log("\n\n❌ Setup cancelled by user", "yellow");
  rl.close();
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  log(`\n❌ Unexpected error: ${error.message}`, "red");
  rl.close();
  process.exit(1);
});

// Run the setup
main().catch((error) => {
  log(`❌ Setup failed: ${error.message}`, "red");
  rl.close();
  process.exit(1);
});
