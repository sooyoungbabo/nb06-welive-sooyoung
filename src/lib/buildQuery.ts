import { Prisma, ResidenceStatus } from '@prisma/client';

// export type WhereInputOf<T extends keyof Prisma.TypeMap['model']> =
//   Prisma.TypeMap['model'][T]['operations']['findMany']['args']['where'];

export function buildPagination(
  params?: { page?: string; limit?: string },
  limitOptions?: { limitDefault?: number; limitMax?: number }
) {
  const page = Math.max(1, Number(params?.page ?? '1'));

  const maxLimit = limitOptions?.limitMax ?? 100;
  const defaultLimit = limitOptions?.limitDefault ?? 10;

  const limit = Math.min(Math.max(1, Number(params?.limit ?? defaultLimit)), maxLimit);

  return {
    skip: (page - 1) * limit,
    take: limit
  };
}

export interface QueryBuilderInput<T = Record<string, unknown>> {
  pagination?: {
    page?: string;
    limit?: string;
  };

  searchKey?: {
    keyword?: string;
    fields?: string[];
  };

  filters?: Record<string, unknown>;

  exactFilters?: T;
}

export function buildWhere<T>(input: QueryBuilderInput<T>) {
  const { searchKey, filters, exactFilters } = input;

  const where: any = {};

  // filters: contain
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
