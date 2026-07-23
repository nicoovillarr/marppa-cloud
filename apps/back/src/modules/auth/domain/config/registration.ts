export function isRegistrationEnabled(): boolean {
  return process.env.REGISTRATION_ENABLED === 'true';
}
