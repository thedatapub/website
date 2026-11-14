export const DEFAULT_PORT = 4173;

export function previewPort(env) {
  const explicit = env.PORT !== undefined;
  if (!explicit) return { port: DEFAULT_PORT, explicit };
  const value = env.PORT.trim();
  if (!/^\d+$/.test(value) || Number(value) > 65535) {
    throw new Error('Invalid PORT: use an integer from 0 to 65535 (0 selects a free port).');
  }
  return { port: Number(value), explicit };
}

export function canUseFreePort(error, explicit) {
  return !explicit && error?.code === 'EADDRINUSE';
}
