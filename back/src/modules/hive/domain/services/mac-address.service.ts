import { Injectable } from "@nestjs/common";

@Injectable()
export class MacAddressService {
  constructor() { }

  generate(): string {
    const firstByte = 0x02;

    const remaining = Array.from({ length: 5 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0")
        .toLowerCase()
    );

    return [
      firstByte.toString(16).padStart(2, "0").toLowerCase(),
      ...remaining,
    ].join(":");
  }
}
