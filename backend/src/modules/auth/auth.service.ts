import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { TokenPayload } from '../../types';
import { AppError } from '../../utils/response';
import { RegisterInput, LoginInput } from './auth.schema';

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: input.accountName,
          province: input.province,
          plan: 'solo',
        },
      });

      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: 'account_owner',
          accountId: account.id,
        },
      });

      await tx.subscription.create({
        data: {
          accountId: account.id,
          plan: 'solo',
          status: 'trialing',
          startDate: new Date(),
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return { user, account };
    });

    const tokens = await this.generateTokens({
      userId: result.user.id,
      accountId: result.account.id,
      role: result.user.role,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: `${result.user.firstName} ${result.user.lastName}`.trim(),
        role: result.user.role,
      },
      account: {
        id: result.account.id,
        businessName: result.account.name,
        province: result.account.province,
        plan: result.account.plan,
      },
      ...tokens,
    };
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { account: true },
    });

    if (!user) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError(403, 'Account deactivated', 'ACCOUNT_DEACTIVATED');
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    if (user.account && user.account.plan) {
      // Check account is not deactivated (no specific field, we rely on subscription status)
    }

    const tokens = await this.generateTokens({
      userId: user.id,
      accountId: user.accountId,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        role: user.role,
      },
      account: user.account
        ? {
            id: user.account.id,
            businessName: user.account.name,
            province: user.account.province,
            plan: user.account.plan,
          }
        : null,
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: tokenHash },
      include: { user: { include: { account: true } } },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid refresh token', 'REFRESH_TOKEN_INVALID');
    }

    // Revoke old token (rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const user = storedToken.user;
    const tokens = await this.generateTokens({
      userId: user.id,
      accountId: user.accountId,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        role: user.role,
      },
      account: user.account
        ? {
            id: user.account.id,
            businessName: user.account.name,
            province: user.account.province,
            plan: user.account.plan,
          }
        : null,
      ...tokens,
    };
  }

  async logout(userId: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  private async generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(
      { ...payload } as object,
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry } as jwt.SignOptions,
    );

    const refreshTokenRaw = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: payload.userId,
        tokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: refreshTokenRaw };
  }
}

export const authService = new AuthService();
