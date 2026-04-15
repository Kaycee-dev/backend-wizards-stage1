const { createApp } = require('./app');
const { runMigrations } = require('./migrate');

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  if (process.env.DATABASE_URL) {
    try {
      await runMigrations();
    } catch (err) {
      console.error('[migrate] failed:', err.message);
    }
  }
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[server] listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error('[server] fatal:', err);
  process.exit(1);
});
