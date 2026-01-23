"use client";

import { useAppStore } from "@/store/app-store";
import { useLayoutStore } from "@/store/layout-store";
import { useEffect } from "react";

type ExtractSetters<T> = {
  [K in keyof T as K extends `set${Capitalize<string>}`
    ? T[K] extends (arg: any) => any
      ? K
      : never
    : never]: T[K];
};

type SetterFunctionMap<T> = {
  [K in keyof ExtractSetters<T> as Uncapitalize<
    K extends `set${infer U}` ? U : never
  >]: ExtractSetters<T>[K];
};

const storeMap = {
  app: useAppStore,
  layout: useLayoutStore,
};

type ClientInitializerProps<T> = {
  store: keyof typeof storeMap;
  props?: Partial<{
    [K in keyof SetterFunctionMap<T>]: SetterFunctionMap<T>[K] extends (
      arg: infer A
    ) => any
      ? A
      : never;
  }>;
};

export default function ClientInitializer<T>({
  store,
  props,
}: ClientInitializerProps<T>) {
  useEffect(() => {
    const currentState = storeMap[store].getState();

    Object.entries(props || {}).forEach(([key, value]) => {
      const setterName = `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
      const setter = (currentState as any)[setterName];
      if (typeof setter === "function") {
        setter(value);
      }
    });

    const setIsInitialized = (currentState as any).setIsInitialized;
    if (typeof setIsInitialized === "function") {
      setIsInitialized(true);
    }

    return () => {
      const setIsInitialized = (currentState as any).setIsInitialized;
      if (typeof setIsInitialized === "function") {
        setIsInitialized(false);
      }
    };
  }, [JSON.stringify(props)]);

  return null;
}
