export default function generateUUID(
  prefix: string = "",
  length: number = 8
): string {
  let result = "";
  const characters = "abcdef0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return prefix + result;
}
