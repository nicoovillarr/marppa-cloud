import { fetcher } from "@/core/api/fetcher";

export type WorkerSshKeyDto = {
  id: number;
  name: string;
  publicKey: string;
  workerId: string;
  createdAt: Date;
  createdBy: string;
};

const baseUrl = "/hive/workers";

export const workerSshKeyApi = {
  list(workerId: string): Promise<WorkerSshKeyDto[]> {
    return fetcher<WorkerSshKeyDto[]>(`${baseUrl}/${workerId}/ssh-keys`);
  },

  create(
    workerId: string,
    name: string,
    publicKey: string,
  ): Promise<WorkerSshKeyDto> {
    return fetcher<WorkerSshKeyDto>(`${baseUrl}/${workerId}/ssh-keys`, "POST", {
      name,
      publicKey,
    });
  },

  remove(workerId: string, keyId: number): Promise<void> {
    return fetcher<void>(`${baseUrl}/${workerId}/ssh-keys/${keyId}`, "DELETE");
  },
};
