import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from '@/auth/domain/services/auth.service';
import { sessionStorage } from '@/auth/infrastructure/als/session.context';
import { Request } from 'express';
import { Utils } from '../../../../libs/utils';
import { CompanyHierarchyService } from '@/shared/domain/services/company-hierarchy.service';
import { JwtEntity } from '@/auth/domain/entities/jwt.entity';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly authService: AuthService,
    private readonly companyHierarchyService: CompanyHierarchyService,
  ) {}

  private async manageableCompanyIdsFor(user: JwtEntity): Promise<string[]> {
    try {
      return await this.companyHierarchyService.selfAndDescendants(
        user.companyId,
      );
    } catch {
      return [user.companyId];
    }
  }

  async use(req: Request, _: any, next: () => void) {
    const token = req.cookies?.access_token;

    if (!token) {
      return next();
    }

    try {
      const payload = await this.authService.getTokenInformation(token);

      if (!payload) {
        return next();
      }

      if (payload.type !== 'access') {
        throw new UnauthorizedException('El token es inválido');
      }

      const { ipAddress } = Utils.parseRequestData(req);
      const manageableCompanyIds = await this.manageableCompanyIdsFor(payload);

      return sessionStorage.run(
        { user: payload, ipAddress, manageableCompanyIds },
        () => {
          next();
        },
      );
    } catch {
      next();
    }
  }
}
