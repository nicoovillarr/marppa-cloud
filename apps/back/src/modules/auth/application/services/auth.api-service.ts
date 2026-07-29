import { Injectable } from '@nestjs/common';
import { Request } from 'express';

import { AuthCache } from '@/auth/infrastructure/cache/auth.cache';
import { AuthService } from '@/auth/domain/services/auth.service';
import { LoginUserDto } from '@/auth/presentation/dtos/login-user.dto';

import { UserService } from '@/user/domain/services/user.service';
import { CreateUserDto } from '@/auth/presentation/dtos/create-user.dto';
import { ResetPasswordDto } from '@/auth/presentation/dtos/reset-password.dto';
import { ConfirmNewPasswordDto } from '@/auth/presentation/dtos/confirm-new-password.dto';
import { JwtEntity } from '@/auth/domain/entities/jwt.entity';
import { Utils } from '../../../../libs/utils';
import { CaptchaService } from '@/shared/infrastructure/services/captcha.service';
import { EmailService } from '@/shared/infrastructure/services/email.service';
import { TokenService } from '@/tokens/domain/services/token.service';
import { TokenType } from '@/tokens/domain/enums/token-types.enum';
import { getFrontendUrl } from '@/auth/domain/config/frontend-url';
import { isRegistrationEnabled } from '@/auth/domain/config/registration';
import { ForbiddenError } from '@/shared/domain/errors/forbidden.error';
import { TooManyRequestsError } from '@/shared/domain/errors/too-many-requests.error';
import { InvalidCredentialsError } from '@/user/domain/errors/invalid-credentials.error';
import { UnauthorizedError } from '@/shared/domain/errors/unauthorized.error';

@Injectable()
export class AuthApiService {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly cache: AuthCache,
    private readonly tokenService: TokenService,
  ) { }

  async register(
    data: CreateUserDto,
    req: Request,
  ): Promise<void> {
    if (!isRegistrationEnabled()) {
      throw new ForbiddenError('El registro está deshabilitado.');
    }

    await CaptchaService.verify(req);

    const user = await this.userService.createUser(data);
    if (!user.id) {
      throw new Error('Could not create user');
    }

    const { refreshToken } =
      await this.authService.generateAndSaveUserTokens(user);

    const requestData = Utils.parseRequestData(req);

    await this.authService.createSessionForUser(
      user.id,
      refreshToken,
      requestData,
    );
  }

  async login(
    data: LoginUserDto,
    req: Request,
  ): Promise<void> {
    await CaptchaService.verify(req);

    const { email, password } = data;

    if (await this.cache.isLoginLockedOut(email)) {
      throw new TooManyRequestsError(
        'Demasiados intentos fallidos. Probá de nuevo más tarde.',
      );
    }

    const user = await this.userService.findUserByEmailOrNull(email);
    const isPasswordValid =
      user != null &&
      (await this.userService.comparePassword(password, user.password));

    if (!user || !isPasswordValid) {
      await this.cache.recordFailedLogin(email);
      throw new InvalidCredentialsError();
    }

    await this.cache.clearFailedLogins(email);

    const { refreshToken } =
      await this.authService.generateAndSaveUserTokens(user);

    const requestData = Utils.parseRequestData(req);

    await this.authService.createSessionForUser(
      user.id!,
      refreshToken,
      requestData,
    );
  }

  async logout(req: Request) {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedError();
    }

    await this.authService.invalidateSession(refreshToken);
  }

  async tick(req: Request): Promise<boolean> {
    const oldRefreshToken = req.cookies.refresh_token;
    if (!oldRefreshToken) {
      return false;
    }

    const userId = await this.validateRefreshToken(oldRefreshToken);
    if (!userId) {
      return false;
    }

    const user = await this.userService.findUserForSessionRefresh(userId);
    if (!user) {
      return false;
    }

    const { refreshToken: newRefreshToken } =
      await this.authService.generateAndSaveUserTokens(user);

    const requestData = Utils.parseRequestData(req);

    await this.authService.createSessionForUser(
      user.id!,
      newRefreshToken,
      requestData,
    );

    await this.authService.deleteSession(oldRefreshToken);

    return true;
  }

  async validateRefreshToken(refreshToken: string): Promise<string | null> {
    const session =
      await this.authService.findSessionByRefreshToken(refreshToken);

    if (!session) {
      return null;
    }

    return session.userId;
  }

  async getTokenInformation(refreshToken: string): Promise<JwtEntity | null> {
    return await this.authService.getTokenInformation(refreshToken);
  }

  async requestPasswordReset(data: ResetPasswordDto, req: Request): Promise<void> {
    await CaptchaService.verify(req);

    const { email } = data;

    const user = await this.userService.findUserByEmailOrNull(email);
    if (!user?.id) {
      return;
    }

    const token = await this.tokenService.create(
      TokenType.PASSWORD_RESET,
      user.id,
    );

    const link = `${getFrontendUrl()}/reset-password?token=${token.token}`;

    await EmailService.send({
      to: email,
      subject: 'Recuperá tu contraseña',
      body: `Podés recuperar tu contraseña ingresando al siguiente link: ${link}`,
    });
  }

  async confirmNewPassword(data: ConfirmNewPasswordDto): Promise<void> {
    const { token, newPassword } = data;
    const { userId } = await this.tokenService.consume(
      token,
      TokenType.PASSWORD_RESET,
    );

    await this.userService.updateUserPassword(userId, newPassword);
  }
}
