import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import { AppError } from '../../utils/response';
import { CreateUserInput, UpdateUserInput } from './users.schema';

export class UsersService {
  async list(accountId: string) {
    return prisma.user.findMany({
      where: { accountId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(accountId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, accountId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
    return user;
  }

  async create(accountId: string, input: CreateUserInput) {
    // Check plan limits
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new AppError(404, 'Account not found', 'NOT_FOUND');

    if (input.role === 'staff' && account.plan === 'solo') {
      throw new AppError(403, 'Staff users require Pro plan or above', 'PLAN_INSUFFICIENT');
    }

    if (input.role === 'accountant' && account.plan !== 'business') {
      throw new AppError(403, 'Accountant role requires Business plan', 'PLAN_INSUFFICIENT');
    }

    if (input.role === 'staff' && account.plan === 'pro') {
      const staffCount = await prisma.user.count({
        where: { accountId, role: 'staff', isActive: true },
      });
      if (staffCount >= 5) {
        throw new AppError(403, 'Pro plan allows up to 5 staff users', 'STAFF_LIMIT');
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, 'Email already in use', 'EMAIL_EXISTS');

    const passwordHash = await bcrypt.hash(input.password, 10);

    return prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        accountId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(accountId: string, userId: string, input: UpdateUserInput) {
    const user = await prisma.user.findFirst({ where: { id: userId, accountId } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

    return prisma.user.update({
      where: { id: userId },
      data: input,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });
  }

  async deactivate(accountId: string, userId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, accountId } });
    if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

    if (user.role === 'account_owner') {
      throw new AppError(403, 'Cannot deactivate account owner', 'CANNOT_DEACTIVATE_OWNER');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }
}

export const usersService = new UsersService();
