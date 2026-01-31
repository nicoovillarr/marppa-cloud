import { ZoneDTO } from "@/libs/types/dto/zone-dto";
import { ResourceStatus, Zone } from "@prisma/client";
import { Netmask } from "netmask";
import prisma from "./prisma";
import { NodeDTO } from "@/libs/types/dto/node-dto";

/**
 * Helper class for managing netmask operations, including subnet allocation and node management.
 * This class provides methods to calculate the next available subnet, check node availability,
 * and manage IP address assignments.
 */
export default class NetmaskHelper {
  /**
   * Get the next available subnet.
   * @param existingSubnets The existing subnets to consider.
   * @param size The size of the subnet to create.
   * @returns The details of the new subnet.
   */
  public static getNextSubnet(
    existingSubnets: Zone[],
    size: number = 8
  ): {
    cidr: string;
    gateway: string;
  } {
    const lastSubnet = existingSubnets
      .map((s) => ({
        cidr: s.cidr,
        ipNumber: this.ipToNumber(s.cidr),
      }))
      .sort((a, b) => a.ipNumber - b.ipNumber)
      .pop();

    const nextIpNum = lastSubnet
      ? lastSubnet.ipNumber +
        Math.pow(2, 32 - Number(lastSubnet.cidr.split("/")[1]))
      : this.ipToNumber("10.0.1.0");

    const nextIp = this.numberToIp(nextIpNum);
    const gateway = this.numberToIp(nextIpNum + 1);
    const prefix = 32 - Math.ceil(Math.log2(size));

    return {
      cidr: `${nextIp}/${prefix}`,
      gateway,
    };
  }

  /**
   * Check if the zone can accommodate another node.
   * @param zone The zone to check for available nodes.
   * @returns A boolean indicating if a new node can be added.
   */
  public static async canGetNextNode(zone: ZoneDTO): Promise<boolean> {
    const baseBlock = new Netmask(zone.cidr);

    const usedIps = new Set(
      zone.nodes
        .filter(
          (node) =>
            node.status === ResourceStatus.ACTIVE &&
            (node.atomId !== null || node.workerId !== null)
        )
        .map((node) => this.ipToNumber(node.ipAddress))
        .concat(zone.gateway ? this.ipToNumber(zone.gateway) : [])
    );

    return usedIps.size < baseBlock.size;
  }

  /**
   * Get the next available node in the given zone. It reutilizes existing nodes if they are available,
   * otherwise it creates a new node with a generated MAC address.
   * @param zone The zone to search for the next node.
   * @returns The next available node.
   */
  public static async getNextNode(zone: ZoneDTO): Promise<NodeDTO> {
    const baseBlock = new Netmask(zone.cidr);

    const startIpNum = this.ipToNumber(baseBlock.base);
    const endIpNum = this.ipToNumber(baseBlock.broadcast);

    const usedIps = new Set(
      zone.nodes
        .filter(
          (node) =>
            node.status === ResourceStatus.ACTIVE &&
            (node.atomId !== null || node.workerId !== null)
        )
        .map((node) => this.ipToNumber(node.ipAddress))
        .concat(zone.gateway ? this.ipToNumber(zone.gateway) : [])
    );

    for (let ipNum = startIpNum + 1; ipNum < endIpNum; ipNum++) {
      if (!usedIps.has(ipNum)) {
        const ip = this.numberToIp(ipNum);
        let node = zone.nodes.find((node) => node.ipAddress === ip) as NodeDTO;

        if (!node) {
          node = await prisma.node.create({
            data: {
              ipAddress: ip,
              zoneId: zone.id,
              createdBy: zone.createdBy,
              updatedBy: zone.updatedBy,
            },
          });
        } else {
          node = await prisma.node.update({
            where: { id: node.id },
            data: {
              status: ResourceStatus.QUEUED,
              updatedBy: zone.updatedBy,
            },
          });
        }

        return node;
      }
    }

    throw new Error("No available IP found in range");
  }

  /**
   * Generate a random MAC address.
   * The first byte is set to 0x02 to indicate a locally administered address.
   * @returns A randomly generated MAC address.
   */
  public static generateMacAddress(): string {
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

  /**
   * Convert an IP address to a number.
   * @param ip The IP address to convert.
   * @returns The numeric representation of the IP address.
   */
  private static ipToNumber(ip: string): number {
    const cidrRegex = /^(?:\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!cidrRegex.test(ip)) {
      throw new Error("Invalid IP address format");
    }

    if (ip.includes("/")) {
      ip = ip.split("/")[0];
    }

    const number = ip
      .split(".")
      .reduce((acc, oct) => (acc << 8) + Number(oct), 0);
    console.log(`Converted IP ${ip} to number: ${number}`);
    return number;
  }

  /**
   * Converts a number to an IP address in the format "x.x.x.x".
   * @param num The numeric representation of the IP address.
   * @returns The IP address in string format.
   */
  private static numberToIp(num: number): string {
    return [24, 16, 8, 0].map((shift) => (num >> shift) & 255).join(".");
  }
}
