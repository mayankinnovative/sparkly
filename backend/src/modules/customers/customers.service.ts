import prisma from '../../config/database';
import { AppError, tenantFilter, requireAccountId } from '../../utils/response';
import { CreateCustomerInput, UpdateCustomerInput } from './customers.schema';

export class CustomersService {
  async list(accountId: string | null) {
    return prisma.customer.findMany({
      where: { ...tenantFilter(accountId), isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getById(accountId: string | null, id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, ...tenantFilter(accountId) },
    });
    if (!customer) throw new AppError(404, 'Customer not found', 'NOT_FOUND');
    return customer;
  }

  async create(accountId: string | null, input: CreateCustomerInput) {
    const aid = requireAccountId(accountId);
    if (input.email) {
      const existing = await prisma.customer.findFirst({
        where: { accountId: aid, email: input.email, isActive: true },
      });
      if (existing) throw new AppError(409, 'Customer email already exists', 'DUPLICATE_EMAIL');
    }

    return prisma.customer.create({
      data: { ...input, accountId: aid },
    });
  }

  async update(accountId: string | null, id: string, input: UpdateCustomerInput) {
    const aid = requireAccountId(accountId);
    const customer = await prisma.customer.findFirst({ where: { id, accountId: aid } });
    if (!customer) throw new AppError(404, 'Customer not found', 'NOT_FOUND');

    return prisma.customer.update({
      where: { id },
      data: input,
    });
  }

  async softDelete(accountId: string | null, id: string) {
    const aid = requireAccountId(accountId);
    const customer = await prisma.customer.findFirst({ where: { id, accountId: aid } });
    if (!customer) throw new AppError(404, 'Customer not found', 'NOT_FOUND');

    const invoiceCount = await prisma.invoice.count({ where: { customerId: id } });
    if (invoiceCount > 0) {
      await prisma.customer.update({
        where: { id },
        data: { isActive: false },
      });
      return;
    }

    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const customersService = new CustomersService();
