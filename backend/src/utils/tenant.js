import ApiError from './ApiError.js';

/**
 * Har list query par schoolId lagana zaroori hai - warna ek school ka data
 * doosre ko dikh jayega. Controllers seedha `where` khud nahi banate,
 * hamesha in helpers se banate hain.
 */
export const scopedWhere = (req, where = {}) => ({ ...where, schoolId: req.schoolId });

/**
 * findByPk + tenant check ek saath. Doosre school ki id daalne par
 * 404 milta hai (403 nahi - taki id exist karti hai ya nahi ye leak na ho).
 */
export async function findScoped(Model, req, id, options = {}) {
    const record = await Model.findOne({
        ...options,
        where: { ...(options.where || {}), id, schoolId: req.schoolId },
    });
    if (!record) throw ApiError.notFound((Model.name || 'Record') + ' not found');
    return record;
}

/** Foreign key doosre school ka to nahi - create/update se pehle check. */
export async function assertSameTenant(Model, req, id, label) {
    if (id === null || id === undefined || id === '') return null;
    const record = await Model.findOne({ where: { id, schoolId: req.schoolId } });
    if (!record) throw ApiError.badRequest((label || Model.name) + ' aapke school me exist nahi karta');
    return record;
}
