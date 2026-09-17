import { Permission, Role, RolePermission } from '../models/index.js';
import { SCHOOL_ROLE_TEMPLATES } from '../config/permissions.js';
import ApiError from '../utils/ApiError.js';

/** Slug list -> permission ids. Galat slug par clean error deta hai. */
export async function permissionIdsForSlugs(slugs, { transaction } = {}) {
    if (!slugs || slugs.length === 0) return [];

    const rows = await Permission.findAll({ where: { slug: slugs }, transaction });
    const found = new Set(rows.map((r) => r.slug));
    const missing = slugs.filter((s) => !found.has(s));
    if (missing.length) {
        throw ApiError.badRequest('Ye permissions exist nahi karti: ' + missing.join(', '));
    }
    return rows.map((r) => r.id);
}

/** Role ke permissions ko exactly diye gaye set par set kar deta hai. */
export async function syncRolePermissions(role, slugs, { transaction } = {}) {
    const ids = await permissionIdsForSlugs(slugs, { transaction });

    await RolePermission.destroy({ where: { roleId: role.id }, transaction });
    if (ids.length) {
        await RolePermission.bulkCreate(
            ids.map((permissionId) => ({ roleId: role.id, permissionId })),
            { transaction }
        );
    }
    return ids.length;
}

/**
 * Naye school ke liye default roles (School Admin, Principal, Teacher,
 * Accountant, Student, Parent) bana deta hai.
 */
export async function seedRolesForSchool(schoolId, { transaction } = {}) {
    const created = {};

    for (const template of SCHOOL_ROLE_TEMPLATES) {
        const [role] = await Role.findOrCreate({
            where: { schoolId, slug: template.slug },
            defaults: {
                schoolId,
                slug: template.slug,
                name: template.name,
                description: template.description,
                scope: 'school',
                isSystem: true,
                portalOnly: Boolean(template.portalOnly),
            },
            transaction,
        });

        await syncRolePermissions(role, template.permissions, { transaction });
        created[template.slug] = role;
    }

    return created;
}
