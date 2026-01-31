import React, { JSX } from "react";
import { resolve, ResolveResult } from "./resolver-base";
import { UserDTO } from "@/libs/types/dto/user-dto";

export type Resolver<T> = (args: {
  params: Promise<Record<string, string | undefined>>;
  user?: UserDTO;
}) => Promise<T>;

type ResolverReturnType<R> = R extends Resolver<infer T> ? T : never;

type ApiCallsResult<T extends readonly Resolver<any>[]> = {
  [K in keyof T]: ResolverReturnType<T[K]>;
};

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type ApiCallsResultIntersection<T extends readonly Resolver<any>[]> =
  UnionToIntersection<ResolverReturnType<T[number]>>;

export type ResolverResult<R extends readonly Resolver<any>[]> =
  ApiCallsResultIntersection<R> & Awaited<ResolveResult>;

async function callPageResolvers<T extends readonly Resolver<any>[]>(
  resolvers: T,
  params: Promise<Record<string, string | undefined>>,
  user?: UserDTO
): Promise<ApiCallsResult<T>> {
  const results = await Promise.all(
    resolvers.map((resolver) => resolver({ params, user }))
  );
  return results as ApiCallsResult<T>;
}

export async function generateResolvePackage<
  R extends readonly Resolver<any>[]
>(
  pageResolvers: R,
  params: Promise<Record<string, string | undefined>>
): Promise<ResolverResult<R>> {
  const base = await resolve({ params });
  const { user } = base;

  const apiCalls = await callPageResolvers(pageResolvers, params, user);

  return apiCalls.reduce(
    (acc, act) => ({ ...acc, ...act }),
    {}
  ) as ResolverResult<R>;
}

export function withResolver<R extends readonly Resolver<any>[]>(
  pageResolvers: R
) {
  return function (
    PageComponent: (props: {
      data: ResolverResult<R>;
    }) => JSX.Element | Promise<JSX.Element>
  ) {
    return async function Wrapper({
      params,
    }: {
      params: Promise<Record<string, string | undefined>>;
    }) {
      const data = await generateResolvePackage(pageResolvers, params);
      return React.createElement(PageComponent, { data });
    };
  };
}
