const REQUIRED_ENV_VARS = [
  'ACCESS_CODE',
  'USERNAME',
  'PASSWORD',
  'CALDAV_USER',
  'CALDAV_PASS',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'COMMS_API_KEY',
  'MAC_BRIDGE_TOKEN',
];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error('[ENV] Missing required environment variables:');
    missing.forEach((key) => console.error(` - ${key}`));
    process.exit(1);
  }
  console.log('[ENV] Required environment variables validated.');
}

module.exports = { validateEnv, REQUIRED_ENV_VARS };
