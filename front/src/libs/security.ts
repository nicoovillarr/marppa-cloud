import { compareSync, genSaltSync, hashSync } from "bcryptjs";
import { JWT } from "@/types/jwt";
import { SignJWT, jwtVerify } from "jose";
import prisma from "./prisma";
import { User } from "@prisma/client";

import "@/libs/extensions/array-extension";

export default class Security {
  /**
   * Cipher a password.
   * @param password Password to cipher.
   * @returns
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = genSaltSync(10);
    return hashSync(password, salt);
  }

  /**
   * Compare a password with a hash.
   * @param password Password a comparar.
   * @param hash Hash to compare.
   * @returns
   */
  static async comparePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return compareSync(password, hash);
  }

  /**
   * Get a token by its value.
   * @param tokenValue Token value.
   * @returns Token object or null if not found.
   */
  static async getJwt(): Promise<JWT | null> {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return null;
    }

    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(process.env.JWT_SECRET)
      );

      return {
        token: token,
        userId: payload.userId as string,
      };
    } catch {
      return null;
    }
  }

  /**
   * Create a session for a user.
   * @param userId User identifier.
   * @returns
   */
  static async createSession(
    userId: string,
    expirationTime: string = "2h"
  ): Promise<string> {
    const jwt = await new SignJWT({ userId })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(expirationTime)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    await prisma.session.create({
      data: {
        token: jwt,
        userId,
      },
    });

    return jwt;
  }

  /**
   * Invalidate a session.
   * @param jwt JWT object.
   */
  static async invalidateSession(jwt: JWT): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        token: jwt.token,
      },
    });
  }

  /**
   * Get logged user data.
   * @returns User data or null if not authenticated.
   */
  static async getUser(): Promise<User> {
    const jwt = await Security.getJwt();
    if (!jwt) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: jwt.userId },
      include: {
        company: true,
      },
    });

    if (!user) {
      return null;
    }

    return user;
  }

  /**
   * Check if a given user has access to a company.
   * @param userId User identifier.
   * @param companyId Company identifier.
   * @returns True if the user has access, false otherwise.
   */
  static async hasUserCompanyAccess(
    userId: string,
    companyId: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
      },
    });

    if (!user) {
      return false;
    }

    return user.companyId === companyId;
  }

  /**
   * Check if a user has access to a list of companies.
   * @param companyId User's company ID.
   * @param companyIds List of company IDs to check against.
   * @returns True if the user has access to any of the companies, false otherwise.
   */
  static async hasUserCompaniesAccess(companyId: string, companyIds: string[]) {
    companyIds = companyIds.distinct();
    const result = await Promise.all(
      companyIds.map(async (id) => {
        return await Security.hasUserCompanyAccess(companyId, id);
      })
    );

    return result.some((r) => !r) === false;
  }
}
