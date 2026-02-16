import { WorkerDTO } from "@/libs/types/dto/worker-dto";
import HiveRepository from "../../domain/repositories/hiveRepository";
import { container } from "@/libs/container";

export class HiveService {
  constructor(private hiveRepository: HiveRepository) {}

  public static get instance(): HiveService {
    return container.resolve<HiveService>("HiveService");
  }

  public fetchWorkers = (): Promise<WorkerDTO[]> =>
    this.hiveRepository.fetchWorkers();

  public createWorker = (
    companyId: string,
    name: string,
    workerMmiId: number,
    imageId: number,
    publicSshKey: string
  ) =>
    this.hiveRepository.createWorker(
      companyId,
      name,
      workerMmiId,
      imageId,
      publicSshKey
    );

  deleteWorker = (workerId: string): Promise<void> =>
    this.hiveRepository.deleteWorker(workerId);

  updateWorker = (
    workerId: string,
    data: WorkerDTO & { zoneId: string | null }
  ): Promise<WorkerDTO> => this.hiveRepository.updateWorker(workerId, data);

  startWorker = (workerId: string): Promise<void> =>
    this.hiveRepository.startWorker(workerId);

  stopWorker = (workerId: string): Promise<void> =>
    this.hiveRepository.stopWorker(workerId);

  arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferView): string {
    let bytes: Uint8Array;
    if (buffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(buffer);
    } else {
      bytes = new Uint8Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength
      );
    }
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  pemEncode(
    arrayBufferOrBuffer: ArrayBuffer | ArrayBufferView | Buffer,
    label: string
  ) {
    let b64;
    if (
      arrayBufferOrBuffer instanceof ArrayBuffer ||
      ArrayBuffer.isView(arrayBufferOrBuffer)
    ) {
      b64 = this.arrayBufferToBase64(arrayBufferOrBuffer);
    } else {
      b64 = Buffer.from(arrayBufferOrBuffer).toString("base64");
    }
    const lines = b64.match(/.{1,64}/g)!.join("\n");
    return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
  }

  jwkToOpenSSH(jwk: JsonWebKey): string {
    function encodeLength(len: number) {
      return new Uint8Array([
        (len >>> 24) & 0xff,
        (len >>> 16) & 0xff,
        (len >>> 8) & 0xff,
        len & 0xff,
      ]);
    }

    function encodeBuffer(buf: Uint8Array) {
      const lengthArray = Array.from(encodeLength(buf.length));
      const bufArray = Array.from(buf);
      return new Uint8Array([...lengthArray, ...bufArray]);
    }

    function base64UrlToBytes(b64url: string): Uint8Array {
      const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64);
      return Uint8Array.from(bin, (c) => c.charCodeAt(0));
    }

    const algo = new TextEncoder().encode("ssh-rsa");
    const eBytes = base64UrlToBytes(jwk.e!);
    const nBytes = base64UrlToBytes(jwk.n!);

    const algoBuffer = encodeBuffer(algo);
    const eBytesBuffer = encodeBuffer(eBytes);
    const nBytesBuffer = encodeBuffer(nBytes);

    const sshBytes = new Uint8Array([
      ...Array.from(algoBuffer),
      ...Array.from(eBytesBuffer),
      ...Array.from(nBytesBuffer),
    ]);

    return "ssh-rsa " + btoa(String.fromCharCode(...Array.from(sshBytes)));
  }
}
