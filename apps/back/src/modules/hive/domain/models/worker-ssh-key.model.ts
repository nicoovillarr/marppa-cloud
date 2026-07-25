export type WorkerSshKeyModel = {
  id: number;
  name: string;
  publicKey: string;
  workerId: string;
  createdAt: Date;
  createdBy: string;
};
