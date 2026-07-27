export const SSH_PUBLIC_KEY_PATTERN =
  /^(ssh-ed25519|ssh-rsa|ecdsa-sha2-[a-z0-9-]+)[ \t]+[A-Za-z0-9+/=]+([ \t]+[^\r\n]*)?$/;

export function isValidSshPublicKey(key: string): boolean {
  return SSH_PUBLIC_KEY_PATTERN.test(key.trim());
}
