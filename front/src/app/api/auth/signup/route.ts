// api/auth/signup

import prisma from "@/libs/prisma";
import { z } from "zod";
import { cookies } from "next/headers";
import { CustomResponse } from "@/libs/custom-response";
import Security from "@/libs/security";

export async function POST(request: Request): Promise<Response> {
  const cookieStore = await cookies();

  const schema = z.object({
    email: z.string({ message: "Email is required" }).email("Invalid email"),
    password: z
      .string({ message: "Password is required" })
      .min(4, "Password must be at least 4 characters"),
    name: z
      .string({ message: "Name is required" })
      .min(4, "Name must be at least 4 characters"),
    company: z.string({ message: "Company id is required" }),
  });

  const response = schema.safeParse(await request.json());
  if (!response.success) {
    const { errors } = response.error;
    return new CustomResponse().status(400).json({
      message: "Invalid request",
      errors,
    });
  }

  const { email, password, name, company } = response.data;

  const existingCompany = await prisma.company.findUnique({
    where: { id: company },
  });
  if (!existingCompany) {
    return new CustomResponse().status(404).json({
      message: "Company not found",
    });
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: await Security.hashPassword(password),
      name,
      company: {
        connect: {
          id: company,
        },
      },
    },
  });

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

  return new CustomResponse().status(201).json(token);
}
