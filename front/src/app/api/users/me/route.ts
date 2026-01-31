import { CustomResponse } from "@/libs/custom-response";
import Security from "@/libs/security";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const user = await Security.getUser(request);
  if (!user) {
    return new CustomResponse().status(401).json({
      message: "Unauthorized",
    });
  }

  return new CustomResponse().status(200).json({
    id: user.id,
    companyId: user.companyId,
    email: user.email,
    name: user.name,
  });
}
