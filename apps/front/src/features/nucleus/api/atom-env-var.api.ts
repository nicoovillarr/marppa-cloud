import { fetcher } from "@/core/api/fetcher";

export type AtomEnvVarDto = {
  id: number;
  key: string;
  value: string;
  atomId: string;
};

const baseUrl = "/nucleus/atoms";

export const atomEnvVarApi = {
  list(atomId: string): Promise<AtomEnvVarDto[]> {
    return fetcher<AtomEnvVarDto[]>(`${baseUrl}/${atomId}/env-vars`);
  },

  upsert(atomId: string, key: string, value: string): Promise<AtomEnvVarDto> {
    return fetcher<AtomEnvVarDto>(`${baseUrl}/${atomId}/env-vars`, "PUT", {
      key,
      value,
    });
  },

  remove(atomId: string, envVarId: number): Promise<void> {
    return fetcher<void>(`${baseUrl}/${atomId}/env-vars/${envVarId}`, "DELETE");
  },
};
