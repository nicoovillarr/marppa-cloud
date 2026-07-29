import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventTypeKey } from '@/event/domain/enums/event-type-key.enum';
import { EventService } from '@/event/domain/services/event.service';
import { EventQueueService } from '@/shared/infrastructure/services/event-queue.service';
import { CompanyService } from '@/company/domain/services/company.service';
import { UserService } from '@/user/domain/services/user.service';
import { getCurrentUser } from '@/auth/infrastructure/als/session.context';
import { defineAbilityFor, policySubject } from '@/shared/domain/policy/ability';

export interface SystemResetAvailability {
  enabled: boolean;
  isRootCompany: boolean;
  canReset: boolean;
}

@Injectable()
export class SystemApiService {
  constructor(
    private readonly config: ConfigService,
    private readonly eventService: EventService,
    private readonly eventQueueService: EventQueueService,
    private readonly companyService: CompanyService,
    private readonly userService: UserService,
  ) {}

  public async availability(): Promise<SystemResetAvailability> {
    const enabled = this.isEnabled();
    const isRootCompany = await this.isRootCompany();

    return { enabled, isRootCompany, canReset: enabled && isRootCompany };
  }

  public async reset(
    hard: boolean,
    confirmPassword?: string,
  ): Promise<{ eventId: number }> {
    const user = getCurrentUser();
    if (!user) {
      throw new UnauthorizedException();
    }

    if (!this.isEnabled()) {
      throw new ForbiddenException(
        'System reset is disabled on this deployment (CAN_RESET_SYSTEM).',
      );
    }

    if (!(await this.isRootCompany())) {
      throw new ForbiddenException(
        'Only members of the root company can reset the system.',
      );
    }

    if (hard) {
      const ability = defineAbilityFor(user);
      if (ability.cannot('manage', policySubject('SystemReset', user.companyId))) {
        throw new ForbiddenException(
          'Solo un owner puede hacer un reset destructivo del sistema.',
        );
      }

      const fullUser = await this.userService.findUserById(user.userId);
      const passwordMatches =
        fullUser != null &&
        confirmPassword != null &&
        (await this.userService.comparePassword(
          confirmPassword,
          fullUser.password,
        ));

      if (!passwordMatches) {
        throw new ForbiddenException(
          'Confirmá tu contraseña para hacer un reset destructivo del sistema.',
        );
      }
    }

    const type = hard
      ? EventTypeKey.SYSTEM_RESET_HARD
      : EventTypeKey.SYSTEM_RESET;

    const { id: eventId } = await this.eventService.create({ type });

    if (eventId == null) {
      throw new Error('SystemApiService: created event missing id');
    }

    await this.eventQueueService.enqueue(eventId);

    return { eventId };
  }

  private isEnabled(): boolean {
    return this.config.get<string>('CAN_RESET_SYSTEM') === 'true';
  }

  private async isRootCompany(): Promise<boolean> {
    const user = getCurrentUser();
    if (!user) return false;

    const company = await this.companyService.findById(user.companyId);

    return !!company && !company.parentCompanyId;
  }
}
