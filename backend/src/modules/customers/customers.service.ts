import prisma from '../../config/database';
import { AppError } from '../../utils/response';
import { CreateCustomerInput, UpdateCustomerInput } from './customers.schema';

export class CustomersService {
  async list(accountId: string) {
    return prisma.customer.findMany({
      where: { accountId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getById(accountId: string, id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, accountId },
    });
    if (!customer) throw new AppError(404, 'Customer not found', 'NOT_FOUND');
    return customer;
  }

  async create(accountId: string, input: CreateCustomerInput) {
    if (input.email) {
      const existing = await prisma.customer.findFirst({
        where: { accountId, email: input.email, isActive: true },
      });
      if (existing) throw new AppError(409, 'Customer email already exists', 'DUPLICATE_EMAIL');
    }

    return prisma.customer.create({
      data: { ...input, accountId },
    });
  }

  async update(accountId: string, id: string, input: UpdateCustomerInput) {
    const customer = await prisma.customer.findFirst({ where: { id, accountId } });
    if (!customer) throw new AppError(404, 'Customer not found', 'NOT_FOUND');

    return prisma.customer.update({
      where: { id },
      data: input,
    });
  }

  async softDelete(accountId: string, id: string) {
    const customer = await prisma.customer.findFirst({ where: { id, accountId } });
    if (!customer) throw new AppError(404, 'Customer not found', 'NOT_FOUND');

    const invoiceCount = await prisma.invoice.count({ where: { customerId: id } });
    if (invoiceCount > 0) {
      // Soft delete only
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
