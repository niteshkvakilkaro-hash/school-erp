export function getPagination(query) {
    const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
    const rawLimit = Number.parseInt(query.limit, 10) || 10;
    const limit = Math.min(100, Math.max(1, rawLimit));
    return { page, limit, offset: (page - 1) * limit };
}

export function paginated({ rows, count, page, limit }) {
    return {
        items: rows,
        meta: {
            total: count,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(count / limit)),
        },
    };
}
