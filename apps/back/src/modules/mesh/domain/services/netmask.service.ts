import { Injectable } from '@nestjs/common';
import { Netmask } from 'netmask';

@Injectable()
export class NetmaskService {
  /**
   * Get the next available subnet.
   * @param lastCidr - CIDR of the most recent zone (with /prefix); omit for the very first zone.
   * @param size - The size of the subnet to create.
   * @returns The details of the new subnet.
   */
  public getNextCidr(
    lastCidr?: string | null,
    size: number = 8,
  ): {
    cidr: string;
    gateway: string;
  } {
    const prefix = 32 - Math.ceil(Math.log2(size));

    if (lastCidr == null) {
      return this.parseCidr(`10.0.0.0/${prefix}`);
    }

    const lastPrefix = Number(lastCidr.split('/')[1]);
    if (!Number.isInteger(lastPrefix) || lastPrefix < 0 || lastPrefix > 32) {
      throw new Error(`Invalid CIDR (missing or bad prefix): ${lastCidr}`);
    }

    const nextIpNum =
      this.ipToNumber(lastCidr) + Math.pow(2, 32 - lastPrefix);

    return this.parseCidr(`${this.numberToIp(nextIpNum)}/${prefix}`);
  }

  /**
   * Validate and normalize a CIDR: returns the network address form and the
   * gateway (first usable host). Throws on malformed, non-private, or
   * too-small ranges (the DHCP layout needs at least a /29).
   */
  public parseCidr(cidr: string): { cidr: string; gateway: string } {
    let block: Netmask;
    try {
      block = new Netmask(cidr);
    } catch {
      throw new Error(`Invalid CIDR: ${cidr}`);
    }

    if (block.bitmask > 29 || block.bitmask < 8) {
      throw new Error(
        `CIDR prefix must be between /8 and /29 (got /${block.bitmask})`,
      );
    }

    const isPrivate =
      new Netmask('10.0.0.0/8').contains(block.base) ||
      new Netmask('172.16.0.0/12').contains(block.base) ||
      new Netmask('192.168.0.0/16').contains(block.base);
    if (!isPrivate) {
      throw new Error(`CIDR must be inside a private (RFC1918) range: ${cidr}`);
    }

    return {
      cidr: `${block.base}/${block.bitmask}`,
      gateway: block.first,
    };
  }

  /**
   * Whether two CIDR blocks share any address.
   */
  public overlaps(cidrA: string, cidrB: string): boolean {
    const a = new Netmask(cidrA);
    const b = new Netmask(cidrB);
    return a.contains(b.base) || b.contains(a.base);
  }

  /**
   * Get the next available ip in the given zone configuration.
   * @param cidr - The CIDR of the zone.
   * @param gateway - The gateway of the zone.
   * @param usedIps - The IPs already used in the zone.
   * @returns The next available ip.
   */
  public getNextIp(cidr: string, gateway: string, usedIps: string[]): string {
    const baseBlock = new Netmask(cidr);

    const startIpNum = this.ipToNumber(baseBlock.base);
    const endIpNum = this.ipToNumber(baseBlock.broadcast);

    const parsed = new Set(
      usedIps.map((ip) => this.ipToNumber(ip)).concat(this.ipToNumber(gateway)),
    );

    let currentIp = startIpNum + 1;
    let ip: string = '';

    while (currentIp < endIpNum && ip == '') {
      if (!parsed.has(currentIp)) {
        ip = this.numberToIp(currentIp);
      }

      currentIp++;
    }

    if (ip == '') {
      throw new Error('No available IP found');
    }

    return ip;
  }

  /**
   * Generate a random MAC address.
   * The first byte is set to 0x02 to indicate a locally administered address.
   * @returns A randomly generated MAC address.
   */
  public generateMacAddress(): string {
    const firstByte = 0x02;

    const remaining = Array.from({ length: 5 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, '0')
        .toLowerCase(),
    );

    return [
      firstByte.toString(16).padStart(2, '0').toLowerCase(),
      ...remaining,
    ].join(':');
  }

  /**
   * Convert an IP address to a number.
   * @param ip - The IP address to convert.
   * @returns The numeric representation of the IP address.
   */
  protected ipToNumber(ip: string): number {
    const cidrRegex = /^(?:\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!cidrRegex.test(ip)) {
      throw new Error('Invalid IP address format');
    }

    if (ip.includes('/')) {
      ip = ip.split('/')[0];
    }

    const number = ip
      .split('.')
      .reduce((acc, oct) => (acc << 8) + Number(oct), 0);
    console.log(`Converted IP ${ip} to number: ${number}`);
    return number;
  }

  /**
   * Converts a number to an IP address in the format "x.x.x.x".
   * @param num - The numeric representation of the IP address.
   * @returns The IP address in string format.
   */
  protected numberToIp(num: number): string {
    return [24, 16, 8, 0].map((shift) => (num >> shift) & 255).join('.');
  }
}
