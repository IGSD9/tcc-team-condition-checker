const path = require("path");
const fs = require("fs");

/** web/.env を PM2 起動時に読み込む */
function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const fileEnv = loadEnvFile();

module.exports = {
  apps: [
    {
      name: "tcc-web",
      cwd: path.join(__dirname, ".."),
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "127.0.0.1",
        ...fileEnv,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "768M",
    },
  ],
};
