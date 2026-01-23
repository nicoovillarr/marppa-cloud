// api/auth/login

import prisma from "@/libs/prisma";
import { z } from "zod";
import { cookies } from "next/headers";
import { CustomResponse } from "@/libs/custom-response";
import Security from "@/libs/security";

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const body = await request.json();

  const schema = z.object({
    email: z.string(),
    password: z.string(),
  });

  const response = schema.safeParse(body);
  if (!response.success) {
    const { errors } = response.error;
    return new CustomResponse().status(400).json({
      message: "Invalid request",
      errors,
    });
  }

  const { email, password } = response.data;

  const user = await prisma.user.findFirst({
    where: {
      email,
    },
  });

  if (!user) {
    return new CustomResponse().status(404).end();
  }

  const valid = await Security.comparePassword(password, user.password);
  if (!valid) {
    return new CustomResponse().status(401).end();
  }

  const token = await Security.createSession(user.id);

  cookieStore.set({
    name: "session",
    value: token,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return new CustomResponse().status(200).json(token);
}
