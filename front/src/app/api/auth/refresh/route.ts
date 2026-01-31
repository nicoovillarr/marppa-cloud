import { CustomResponse } from "@/libs/custom-response";
import Security from "@/libs/security";

export async function POST() {
  const newAccessToken = await Security.verifyRefreshToken();
  return new CustomResponse().status(200).json(newAccessToken);
}
