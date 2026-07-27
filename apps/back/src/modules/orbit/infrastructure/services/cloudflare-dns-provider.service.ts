import { Injectable } from '@nestjs/common';
import { DnsProvider } from '../../domain/services/dns-provider.service';
import { PortalType } from '../../domain/enum/portal-type.enum';
import { BadRequestError } from '@/shared/domain/errors/bad-request.error';
import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';

const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';

@Injectable()
export class CloudflareDnsProvider extends DnsProvider {
  public async assertCanManage(
    type: PortalType,
    address: string,
    apiKey: string,
  ): Promise<void> {
    if (type !== PortalType.CLOUDFLARE) {
      throw new BadRequestError(`Unsupported portal type: ${type}`);
    }

    const zoneName = address.split('.').slice(-2).join('.');
    const zone = await this.findZone(zoneName, apiKey);

    if (zone == null) {
      throw new ForbiddenError(
        `That API token cannot manage ${zoneName}. Use a token scoped to the zone that owns ${address}.`,
      );
    }
  }

  private async findZone(zoneName: string, apiKey: string): Promise<unknown | null> {
    let response: Response;

    try {
      response = await fetch(
        `${CLOUDFLARE_API}/zones?name=${encodeURIComponent(zoneName)}`,
        { headers: { Authorization: `Bearer ${apiKey}` } },
      );
    } catch {
      throw new BadRequestError(
        'Could not reach Cloudflare to verify the API token. Try again.',
      );
    }

    const data: any = await response.json().catch(() => null);
    if (data?.success !== true) {
      return null;
    }

    return data.result?.[0] ?? null;
  }
}
