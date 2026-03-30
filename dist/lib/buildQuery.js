"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPagination = buildPagination;
exports.buildWhere = buildWhere;
// export type WhereInputOf<T extends keyof Prisma.TypeMap['model']> =
//   Prisma.TypeMap['model'][T]['operations']['findMany']['args']['where'];
function buildPagination(params, limitOptions) {
    var _a, _b, _c, _d;
    const page = Math.max(1, Number((_a = params === null || params === void 0 ? void 0 : params.page) !== null && _a !== void 0 ? _a : '1'));
    const maxLimit = (_b = limitOptions === null || limitOptions === void 0 ? void 0 : limitOptions.limitMax) !== null && _b !== void 0 ? _b : 100;
    const defaultLimit = (_c = limitOptions === null || limitOptions === void 0 ? void 0 : limitOptions.limitDefault) !== null && _c !== void 0 ? _c : 10;
    const limit = Math.min(Math.max(1, Number((_d = params === null || params === void 0 ? void 0 : params.limit) !== null && _d !== void 0 ? _d : defaultLimit)), maxLimit);
    return {
        skip: (page - 1) * limit,
        take: limit
    };
}
function buildWhere(input) {
    var _a;
    const { searchKey, filters, exactFilters } = input;
    const where = {};
    // filters: contain
    if (filters) {
        for (const key in filters) {
            const value = filters[key];
            if (value === undefined)
                continue;
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
            if (value === undefined)
                continue;
            where[key] = value;
        }
    }
    // keyword search
    if ((searchKey === null || searchKey === void 0 ? void 0 : searchKey.keyword) && ((_a = searchKey.fields) === null || _a === void 0 ? void 0 : _a.length)) {
        where.OR = searchKey.fields.map((field) => ({
            [field]: {
                contains: searchKey.keyword,
                mode: 'insensitive'
            }
        }));
    }
    return where;
}
