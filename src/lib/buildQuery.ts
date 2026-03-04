import { Prisma } from '@prisma/client';

export type WhereInputOf<T extends keyof Prisma.TypeMap['model']> =
  Prisma.TypeMap['model'][T]['operations']['findMany']['args']['where'];

export interface QueryBuilderInput {
  pagination?: {
    page?: string;
    limit?: string;
  };

  searchKey?: {
    keyword?: string;
    fields?: string[];
  };

  filters?: Record<string, any>;

  exactFilters?: Record<string, any>;
}

export function buildPagination(
  params: { page?: string; limit?: string },
  limitOptions?: { limitDefault?: number; limitMax?: number }
): {
  skip: number;
  take: number;
} {
  const page = Math.max(1, Number(params.page ?? '1'));
  const maxLimit = limitOptions?.limitMax ?? 100;
  const defaultLimit = limitOptions?.limitDefault ?? 10;
  const limit = Math.min(Math.max(1, Number(params.limit ?? defaultLimit)), maxLimit);

  const skip = (page - 1) * limit;
  return { skip, take: limit };
}

export function buildWhere(input: QueryBuilderInput) {
  const { searchKey, filters, exactFilters } = input;

  const where: any = {};

  // contains filters
  if (filters) {
    for (const key in filters) {
      const value = filters[key];
      if (value === undefined) continue;

      where[key] = {
        contains: value,
        mode: 'insensitive'
      };
    }
  }

  // exact filters
  if (exactFilters) {
    for (const key in exactFilters) {
      const value = exactFilters[key];
      if (value === undefined) continue;

      where[key] = value;
    }
  }

  // keyword search
  if (searchKey?.keyword && searchKey.fields?.length) {
    where.OR = searchKey.fields.map((field) => ({
      [field]: {
        contains: searchKey.keyword,
        mode: 'insensitive'
      }
    }));
  }
  return where;
}
