// api/auth/logout

import { CustomResponse } from "@/libs/custom-response";
import Security from "@/libs/security";
import { cookies } from "next/headers";

export async function POST(): Promise<Response> {
  const cookieStore = await cookies();
  const jwt = await Security.getJwt();
  if (!jwt) {
    return new CustomResponse().status(401).end();
  }

  await Security.invalidateSession(jwt);

  cookieStore.set("session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return new CustomResponse().status(200).end();
}
