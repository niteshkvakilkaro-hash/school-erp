import { z } from 'zod';
import { Op } from 'sequelize';
import { sequelize, Role, Permission, User } from '../models/index.js';
import { syncRolePermissions } from '../services/rbac.service.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { scopedWhere, findScoped } from '../utils/tenant.js';

const slugify = (v) =>
    v
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

export const roleCreateSchema = z.object({
    name: z.string().trim().min(2, 'Role ka naam chahiye').max(60),
    description: z.string().trim().max(255).optional(),
    portalOnly: z.coerce.boolean().default(false),
    permissions: z.array(z.string().trim()).default([]),
});

export const roleUpdateSchema = roleCreateSchema.partial();

const permInclude = {
    model: Permission,
    as: 'permissions',
    through: { attributes: [] },
    attributes: ['id', 'slug', 'module', 'label'],
};

/** Roles & Permissions screen ke liye poora catalog, module-wise grouped. */
export const catalog = asyncHandler(async (_req, res) => {
    const permissions = await Permission.findAll({
        where: { scope: 'school' },
        order: [
            ['module', 'ASC'],
            ['slug', 'ASC'],
        ],
    });

    const grouped = [];
    for (const p of permissions) {
        let group = grouped.find((g) => g.module === p.module);
        if (!group) {
            group = { module: p.module, items: [] };
            grouped.push(group);
        }
        group.items.push({ id: p.id, slug: p.slug, label: p.label });
    }

    res.json({ success: true, data: grouped });
});

export const list = asyncHandler(async (req, res) => {
    const roles = await Role.findAll({
        where: scopedWhere(req),
        include: [permInclude],
        order: [
            ['isSystem', 'DESC'],
            ['name', 'ASC'],
        ],
    });

    // Har role par kitne users hain - delete se pehle warning dikhane ke liye
    const users = await User.findAll({
        attributes: ['roleId'],
        where: scopedWhere(req),
    });
    const tally = {};
    for (const u of users) tally[u.roleId] = (tally[u.roleId] || 0) + 1;

    res.json({
        success: true,
        data: roles.map((r) => ({
            ...r.toJSON(),
            userCount: tally[r.id] || 0,
            permissionSlugs: r.permissions.map((p) => p.slug),
        })),
    });
});

export const getOne = asyncHandler(async (req, res) => {
    const role = await findScoped(Role, req, req.params.id, { include: [permInclude] });
    res.json({
        success: true,
        data: { ...role.toJSON(), permissionSlugs: role.permissions.map((p) => p.slug) },
    });
});

/** Platform permissions school role par nahi lag sakti. */
async function assertSchoolPermissions(slugs) {
    if (!slugs?.length) return;
    const bad = await Permission.count({ where: { slug: slugs, scope: 'platform' } });
    if (bad > 0) {
        throw ApiError.forbidden('Platform permissions school role par assign nahi ho sakti');
    }
}

export const create = asyncHandler(async (req, res) => {
    const { name, description, portalOnly, permissions } = req.body;
    const slug = slugify(name);

    const clash = await Role.findOne({ where: { schoolId: req.schoolId, slug } });
    if (clash) throw ApiError.conflict('Is naam ka role pehle se hai');

    await assertSchoolPermissions(permissions);

    const role = await sequelize.transaction(async (t) => {
        const created = await Role.create(
            {
                schoolId: req.schoolId,
                name,
                slug,
                description,
                portalOnly,
                scope: 'school',
                isSystem: false,
            },
            { transaction: t }
        );
        await syncRolePermissions(created, permissions, { transaction: t });
        return created;
    });

    const full = await Role.findByPk(role.id, { include: [permInclude] });
    res.status(201).json({ success: true, message: 'Role ban gaya', data: full });
});

export const update = asyncHandler(async (req, res) => {
    const role = await findScoped(Role, req, req.params.id);
    const { name, description, portalOnly, permissions } = req.body;

    await assertSchoolPermissions(permissions);

    await sequelize.transaction(async (t) => {
        const patch = {};
        // System role ka naam/slug fix rehta hai, sirf permissions badal sakti hain
        if (!role.isSystem) {
            if (name !== undefined) {
                patch.name = name;
                patch.slug = slugify(name);
            }
            if (portalOnly !== undefined) patch.portalOnly = portalOnly;
        }
        if (description !== undefined) patch.description = description;
        if (Object.keys(patch).length) await role.update(patch, { transaction: t });

        if (permissions !== undefined) {
            await syncRolePermissions(role, permissions, { transaction: t });
        }
    });

    const full = await Role.findByPk(role.id, { include: [permInclude] });
    res.json({ success: true, message: 'Role update ho gaya', data: full });
});

export const remove = asyncHandler(async (req, res) => {
    const role = await findScoped(Role, req, req.params.id);

    if (role.isSystem) throw ApiError.forbidden('Default role delete nahi ho sakta');

    const userCount = await User.count({ where: { roleId: role.id } });
    if (userCount > 0) {
        throw ApiError.conflict(
            userCount + ' users is role par hain - pehle unhe doosre role me shift kijiye'
        );
    }

    await role.destroy();
    res.json({ success: true, message: 'Role delete ho gaya' });
});

/** User form ke dropdown ke liye. */
export const options = asyncHandler(async (req, res) => {
    const roles = await Role.findAll({
        where: scopedWhere(req),
        attributes: ['id', 'name', 'slug', 'portalOnly'],
        order: [['name', 'ASC']],
    });
    res.json({ success: true, data: roles });
});
