const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Utility function to run shell commands
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log("Command output:", stdout);
        console.log("Command stderr:", stderr);
        resolve({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Function to fix common React hooks exhaustive deps issues
function fixReactHooksDeps(content) {
  // Fix missing dependencies in useCallback
  content = content.replace(
    /useCallback\((.*?),\s*\[\s*\]\s*\)/gs,
    (match, fn) => {
      // Extract variable names from the function body
      const variables = [];
      const variableRegex = /(?:^|\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:\(|\.)/g;
      let variableMatch;
      while ((variableMatch = variableRegex.exec(fn)) !== null) {
        const varName = variableMatch[1];
        if (
          !["console", "window", "document", "Math", "Date", "JSON"].includes(
            varName,
          )
        ) {
          variables.push(varName);
        }
      }
      const deps = [...new Set(variables)].join(", ");
      return `useCallback(${fn}, [${deps}])`;
    },
  );

  return content;
}

// Function to fix common TypeScript any types
function fixTypeScriptAny(content) {
  // Fix common any type patterns
  content = content.replace(/: any\[\]/g, ": unknown[]");
  content = content.replace(/: any\s*=/g, ": Record<string, unknown> =");
  content = content.replace(/error: any/g, "error: Error | unknown");
  content = content.replace(/data: any/g, "data: Record<string, unknown>");
  content = content.replace(/props: any/g, "props: Record<string, unknown>");
  content = content.replace(/event: any/g, "event: Event");
  content = content.replace(
    /response: any/g,
    "response: Record<string, unknown>",
  );

  return content;
}

// Function to fix React refresh warnings
function fixReactRefresh(content) {
  // Add display names to components
  content = content.replace(
    /export const ([A-Z][a-zA-Z0-9]*)\s*[:=]/g,
    (match, componentName) => {
      if (!content.includes(`${componentName}.displayName`)) {
        return `${match.slice(0, -1)}\n${componentName}.displayName = '${componentName}';${match.slice(-1)}`;
      }
      return match;
    },
  );

  return content;
}

// Function to process a single file
async function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    const originalContent = content;

    // Apply fixes
    content = fixReactHooksDeps(content);
    content = fixTypeScriptAny(content);
    content = fixReactRefresh(content);

    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Fixed: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Function to process directory recursively
function processDirectory(dir, extensions = [".ts", ".tsx"]) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (
      stat.isDirectory() &&
      !file.includes("node_modules") &&
      !file.includes(".git") &&
      !file.includes("dist")
    ) {
      fixedCount += processDirectory(filePath, extensions);
    } else if (stat.isFile() && extensions.some((ext) => file.endsWith(ext))) {
      if (processFile(filePath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

async function main() {
  const apps = [
    "c:\\Users\\Drood\\Desktop\\Blunari SAAS\\apps\\client-dashboard\\src",
    "c:\\Users\\Drood\\Desktop\\Blunari SAAS\\apps\\admin-dashboard\\src",
  ];

  console.log("Starting automated lint fixes...");

  for (const appDir of apps) {
    if (fs.existsSync(appDir)) {
      console.log(`\nProcessing ${appDir}...`);
      const fixedCount = processDirectory(appDir);
      console.log(`Fixed ${fixedCount} files in ${appDir}`);
    }
  }

  console.log("\nRunning final lint check...");

  // Run lint on both apps
  for (const app of ["client-dashboard", "admin-dashboard"]) {
    console.log(`\nChecking ${app}...`);
    const result = await runCommand(
      `cd "c:\\Users\\Drood\\Desktop\\Blunari SAAS\\apps\\${app}" && npm run lint`,
    );
    if (result.stdout) {
      const problemsMatch = result.stdout.match(/(\d+) problems/);
      if (problemsMatch) {
        console.log(`${app}: ${problemsMatch[1]} problems remaining`);
      }
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}
