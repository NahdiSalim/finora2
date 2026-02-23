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
    private configService: ConfigService
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
          errors.BAD_CREDENTIEL.errorCode
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new ApiError(
          errors.BAD_CREDENTIEL.message,
          errors.BAD_CREDENTIEL.code,
          errors.BAD_CREDENTIEL.errorCode
        );
      }

      const payload = { sub: user.id, email: user.email };
      const { accessToken, refreshToken } = this.jwtTokenService.generateTokens(payload);

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
          errors.INVALID_TOKEN.errorCode
        );
      }

      const { sub, email } = decoded as unknown as JwtPayload;

      const storedRefreshToken = await this.jwtTokenService.findValidRefreshToken(sub);

      if (!storedRefreshToken) {
        console.log('No valid refresh token found for user:', sub);
        throw new ApiError(
          errors.INVALID_TOKEN.message,
          errors.INVALID_TOKEN.code,
          errors.INVALID_TOKEN.errorCode
        );
      }

      const { accessToken, refreshToken } = this.jwtTokenService.generateTokens({
        sub,
        email,
      });

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
        errors.INVALID_TOKEN.errorCode
      );
    }
  }

  async verifyAndRefreshToken(accessToken: string): Promise<{
    user: JwtPayload;
    newTokens?: { access_token: string; refresh_token: string };
  }> {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');

    try {
      const decoded = jwt.verify(accessToken, jwtSecret) as unknown as JwtPayload;
      return { user: decoded };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        //console.log('Access token expired, attempting to refresh...', error);
        return this.refreshExpiredToken(accessToken);
      }

      throw new ApiError(
        errors.INVALID_TOKEN.message,
        errors.INVALID_TOKEN.code,
        errors.INVALID_TOKEN.errorCode
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
          phone: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          role: {
            select: {
              id: true,
              nameFr: true,
              nameEn: true,
              descriptionFr: true,
              descriptionEn: true,

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
                      featureId: true,
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
          errors.NOT_FOUND.errorCode
        );
      }

      if (!user.role) {
        throw new ApiError(
          errors.NOT_FOUND.message,
          errors.NOT_FOUND.code,
          errors.NOT_FOUND.errorCode
        );
      }

      if (!user.isActive) {
        throw new ApiError(
          errors.BLOCKED_USER.message,
          errors.BLOCKED_USER.code,
          errors.BLOCKED_USER.errorCode
        );
      }

      // Build features structure with pages and actions
      const featuresMap = new Map();
      const role = user.role; // TypeScript assertion

      // First, create all features
      role.p_features.forEach((pf) => {
        if (!featuresMap.has(pf.feature.id)) {
          featuresMap.set(pf.feature.id, {
            id: String(pf.feature.id),
            name: pf.feature.slug,
            code: pf.feature.slug,
            pages: [],
          });
        }
      });

      // Then, add pages to their respective features
      role.p_pages.forEach((pp) => {
        const feature = featuresMap.get(pp.page.featureId);
        if (feature) {
          // Get actions (tasks) for this page
          const pageActions = role.p_tasks
            .filter((pt) => pt.task.id_page === pp.page.id)
            .map((pt) => ({
              id: String(pt.task.id),
              name: pt.task.slug,
              code: this.mapTaskToActionCode(pt.task.slug),
            }));

          feature.pages.push({
            id: String(pp.page.id),
            name: pp.page.slug,
            code: pp.page.slug,
            route: pp.page.PageUrl,
            actions: pageActions,
          });
        }
      });

      const features = Array.from(featuresMap.values());

      // Return structure matching frontend VerifyUserResponse
      return {
        id: String(user.id),
        email: user.email,
        full_name: user.username,
        sex: null,
        dateOfBirth: null,
        status: user.isActive ? 'active' : 'inactive',
        address: null,
        phone: user.phone || '',
        is_active: user.isActive,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
        role: {
          id: String(role.id),
          name: role.nameEn,
          code: role.nameFr.toLowerCase().replace(/\s+/g, '_'),
          description: role.descriptionEn,
        },
        features,
        token: '', // Token is in the Authorization header
      };
    } catch (err) {
      console.error('Get current user error:', err);
      throw err;
    }
  }

  // Helper method to map task slugs to action codes
  private mapTaskToActionCode(slug: string): 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' {
    if (slug.includes('view') || slug.includes('read')) return 'READ';
    if (slug.includes('add') || slug.includes('create')) return 'CREATE';
    if (slug.includes('edit') || slug.includes('update')) return 'UPDATE';
    if (slug.includes('delete') || slug.includes('remove')) return 'DELETE';
    return 'READ'; // Default
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
          errors.NOT_FOUND.errorCode
        );
      }

      if (!user.isActive) {
        throw new ApiError(
          errors.BLOCKED_USER.message,
          errors.BLOCKED_USER.code,
          errors.BLOCKED_USER.errorCode
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
        errors.BAD_EMAIL_CREDENTIEL.errorCode
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
    confirmepassword: string
  ): Promise<{ message: string }> {
    try {
      const hashedToken = this.hashService.hashToken(token);

      if (!password || password === '') {
        throw new ApiError(
          errors.BAD_REQUEST.message,
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode
        );
      }

      if (password !== confirmepassword) {
        throw new ApiError(
          errors.BAD_REQUEST.message,
          errors.BAD_REQUEST.code,
          errors.BAD_REQUEST.errorCode
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
          errors.INVALID_TOKEN.errorCode
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
