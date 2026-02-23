import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtTokenService } from 'src/common/jwt/jwt-token.service';
import { HashService } from 'src/common/crypto/hash.service';
import { ApiError } from 'src/common/errors/api-error';
import { errors } from 'src/common/errors/errors';
import * as jwt from 'jsonwebtoken';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './types/jwt-payload.type';
import { AuthRequest } from './types/user-type';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private hashService: HashService,
    private jwtTokenService: JwtTokenService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  // Login
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          role: {
            include: {
              p_features: {
                include: {
                  feature: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new ApiError(
          errors.BAD_CREDENTIEL.message,
          errors.BAD_CREDENTIEL.code,
          errors.BAD_CREDENTIEL.errorCode,
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new ApiError(
          errors.BAD_CREDENTIEL.message,
          errors.BAD_CREDENTIEL.code,
          errors.BAD_CREDENTIEL.errorCode,
        );
      }

      const payload = { sub: user.id, email: user.email };
      const { accessToken, refreshToken } =
        this.jwtTokenService.generateTokens(payload);

      await this.jwtTokenService.storeRefreshToken(user.id, refreshToken);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role?.nameEn,
          },
          accessToken,
          refreshToken,
        },
      };
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }

  // Logout (revoke single token)
  async logout(refreshToken: string) {
    const hashedToken = this.hashService.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { token: hashedToken },
      data: { isRevoked: true },
    });

    return { success: true, message: 'Logged out successfully' };
  }

  async refreshExpiredToken(expiredAccessToken: string) {
    try {
      const decoded = jwt.decode(expiredAccessToken);

      if (!decoded) {
        throw new ApiError(
          errors.INVALID_TOKEN.message,
          errors.INVALID_TOKEN.code,
          errors.INVALID_TOKEN.errorCode,
        );
      }

      const { sub, email } = decoded as unknown as JwtPayload;

      const storedRefreshToken =
        await this.jwtTokenService.findValidRefreshToken(sub);

      if (!storedRefreshToken) {
        console.log('No valid refresh token found for user:', sub);
        throw new ApiError(
          errors.INVALID_TOKEN.message,
          errors.INVALID_TOKEN.code,
          errors.INVALID_TOKEN.errorCode,
        );
      }

      const { accessToken, refreshToken } = this.jwtTokenService.generateTokens(
        {
          sub,
          email,
        },
      );

      await this.jwtTokenService.deleteOldRefreshToken(storedRefreshToken.id);

      await this.jwtTokenService.storeRefreshToken(sub, refreshToken);

      console.log('Tokens refreshed successfully for user:', sub);

      return {
        user: { sub, email },
        newTokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
        },
      };
    } catch (error) {
      console.error('Error refreshing token:', error);

      throw new ApiError(
        errors.INVALID_TOKEN.message,
        errors.INVALID_TOKEN.code,
        errors.INVALID_TOKEN.errorCode,
      );
    }
  }

  async verifyAndRefreshToken(accessToken: string): Promise<{
    user: JwtPayload;
    newTokens?: { access_token: string; refresh_token: string };
  }> {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');

    try {
      const decoded = jwt.verify(
        accessToken,
        jwtSecret,
      ) as unknown as JwtPayload;
      return { user: decoded };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        //console.log('Access token expired, attempting to refresh...', error);
        return this.refreshExpiredToken(accessToken);
      }

      throw new ApiError(
        errors.INVALID_TOKEN.message,
        errors.INVALID_TOKEN.code,
        errors.INVALID_TOKEN.errorCode,
      );
    }
  }

  async getCurrentUser(req: AuthRequest) {
    const loggedUserId = req?.user?.id;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: Number(loggedUserId) },
        select: {
          id: true,
          email: true,
          username: true,
          isActive: true,
          role: {
            select: {
              id: true,
              nameFr: true,
              nameEn: true,

              p_tasks: {
                include: {
                  task: {
                    select: {
                      id: true,
                      slug: true,
                      id_page: true,
                    },
                  },
                },
              },

              p_features: {
                include: {
                  feature: {
                    select: {
                      id: true,
                      slug: true,
                    },
                  },
                },
              },

              p_pages: {
                include: {
                  page: {
                    select: {
                      id: true,
                      slug: true,
                      PageUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new ApiError(
          errors.NOT_FOUND.message,
          errors.NOT_FOUND.code,
          errors.NOT_FOUND.errorCode,
        );
      }

      if (!user.role) {
        throw new ApiError(
          errors.NOT_FOUND.message,
          errors.NOT_FOUND.code,
          errors.NOT_FOUND.errorCode,
        );
      }

      if (!user.isActive) {
        throw new ApiError(
          errors.BLOCKED_USER.message,
          errors.BLOCKED_USER.code,
          errors.BLOCKED_USER.errorCode,
        );
      }

      return {
        id: user?.id,
        email: user?.email,
        username: user?.username,
        isActive: user?.isActive,
        role: {
          id: user?.role?.id,
          nameEn: user?.role?.nameEn,
          nameFr: user?.role?.nameFr,
        },
        permissions: {
          features: user.role.p_features.map((pf) => pf.feature),
          pages: user.role.p_pages.map((pp) => pp.page),
          tasks: user.role.p_tasks.map((pt) => pt.task),
        },
      };
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }

  // Get full user by ID
  async getFullUserById(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          isActive: true,
          role: {
            select: {
              id: true,
              nameFr: true,
              nameEn: true,
            },
          },
        },
      });

      if (!user) {
        throw new ApiError(
          errors.NOT_FOUND.message,
          errors.NOT_FOUND.code,
          errors.NOT_FOUND.errorCode,
        );
      }

      if (!user.isActive) {
        throw new ApiError(
          errors.BLOCKED_USER.message,
          errors.BLOCKED_USER.code,
          errors.BLOCKED_USER.errorCode,
        );
      }

      return user;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }

  // ForgotPassword
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ApiError(
        errors.BAD_EMAIL_CREDENTIEL.message,
        errors.BAD_EMAIL_CREDENTIEL.code,
        errors.BAD_EMAIL_CREDENTIEL.errorCode,
      );
    }

    const resetToken = this.jwtTokenService.generateResetToken({
      sub: user.id,
      email: user.email,
    });

    const hashedToken = this.hashService.hashToken(resetToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });

    // Build reset link
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.mailService.sendPasswordResetEmail(user.email, resetLink);

    return { message: 'Password reset email sent successfully' };
  }

  // ResetPassword
  async resetPassword(
    token: string,
    password: string,
    confirmepassword: string,
  ): Promise<{ message: string }> {
    try {
      const hashedToken = this.hashService.hashToken(token);

      if (!password || password === '') {
        throw new ApiError(
          errors.BAD_REQUEST.message,
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode,
        );
      }

      if (password !== confirmepassword) {
        throw new ApiError(
          errors.BAD_REQUEST.message,
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode,
        );
      }

      const user = await this.prisma.user.findFirst({
        where: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        throw new ApiError(
          errors.INVALID_TOKEN.message,
          errors.INVALID_TOKEN.code,
          errors.INVALID_TOKEN.errorCode,
        );
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });

      return { message: 'Password reset successfully' };
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  }
}
