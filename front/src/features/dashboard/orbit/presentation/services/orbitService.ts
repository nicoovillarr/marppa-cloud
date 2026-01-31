import { container } from "@/libs/container";
import type OrbitRepository from "../../domain/repositories/orbitRepository";
import { PortalDTO } from "@/libs/types/dto/portal-dto";
import { TransponderDTO } from "@/libs/types/dto/transponder-dto";
import { TransponderMode } from "@prisma/client";

export default class OrbitService {
  constructor(private orbitRepository: OrbitRepository) {}

  public static get instance(): OrbitService {
    return container.resolve<OrbitService>("OrbitService");
  }

  public async getPortals() {
    return this.orbitRepository.getPortals();
  }

  public async getPortal(portalId: string) {
    return this.orbitRepository.getPortal(portalId);
  }

  public async createPortal(data: PortalDTO) {
    return this.orbitRepository.createPortal(data);
  }

  public async updatePortal(portalId: string, data: PortalDTO) {
    return this.orbitRepository.updatePortal(portalId, data);
  }

  public async validatePortal(
    data: PortalDTO,
    forceCheckApiKey: boolean = false
  ): Promise<Record<string, string>> {
    const portals = (await this.orbitRepository.getPortals()).filter(
      (p) => data.id && p.id !== data.id
    );

    const { id, name, address, type: portalType, apiKey } = data;

    const validationErrors: Record<string, string> = {};

    const onError = (field: string, message: string) => {
      if (!validationErrors[field]) {
        validationErrors[field] = message;
      }
    };

    if (!name || name.trim() === "") {
      onError("name", "Portal Name is required.");
    }

    if (portals.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      onError("name", "This portal name already exists.");
    }

    if (!address) {
      onError("address", "Address is required.");
    }

    const domainExists = portals.some(
      (p) => p.address.toLowerCase() === address.toLowerCase()
    );
    if (domainExists) {
      onError("address", "This domain already exists.");
    }

    const isAddressValid = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(address);
    if (!isAddressValid) {
      onError("address", "Invalid domain format.");
    }

    if (!portalType) {
      onError("type", "Please select a DDNS provider.");
    }

    if ((!id || forceCheckApiKey) && (!apiKey || apiKey.trim() === "")) {
      onError("apiKey", "API Key is required.");
    }

    return validationErrors;
  }

  public async deletePortals(portalIds: string[]) {
    return this.orbitRepository.deletePortals(portalIds);
  }

  public async validateTransponder(
    data: TransponderDTO
  ): Promise<Record<string, string>> {
    const validationErrors: Record<string, string> = {};

    const onError = (field: string, message: string) => {
      if (!validationErrors[field]) {
        validationErrors[field] = message;
      }
    };

    if (!data.path || data.path.trim() === "") {
      onError("path", "Path is required.");
    }

    if (!data.mode || data.mode.trim() === "") {
      onError("mode", "Mode is required.");
    }

    if (!Object.values(TransponderMode).includes(data.mode)) {
      onError("mode", "Invalid mode.");
    }

    if (data.nodeId == null) {
      onError("nodeId", "Please select a Node.");
    }

    if (!data.port || data.port <= 0 || data.port > 65535) {
      onError("port", "Port must be between 1 and 65535.");
    }

    if (data.priority != null && data.priority < 0) {
      onError("priority", "Priority must be a non-negative number.");
    }

    return validationErrors;
  }

  public async createTransponder(portalId: string, data: TransponderDTO) {
    return this.orbitRepository.createTransponder(portalId, data);
  }

  public async updateTransponder(
    portalId: string,
    transponderId: string,
    data: TransponderDTO
  ) {
    return this.orbitRepository.updateTransponder(
      portalId,
      transponderId,
      data
    );
  }
}
