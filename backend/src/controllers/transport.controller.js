import { z } from 'zod';
import { Op, fn, col } from 'sequelize';
import {
    sequelize, Vehicle, TransportRoute, RouteStop, StudentTransport, Student, SchoolClass, Section,
} from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const optTime = z
    .preprocess((v) => (v === '' || v === null ? undefined : v), z.string().regex(TIME, 'Time HH:MM format me'))
    .optional();
const optDate = z
    .preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.date().transform((d) => d.toISOString().slice(0, 10)).nullable()
    )
    .optional();
const optFk = z
    .preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.number().int().positive().nullable()
    )
    .optional();
const phone = z.string().trim().max(20).optional();

export const vehicleSchema = z.object({
    regNo: z.string().trim().min(4, 'Registration number chahiye').max(20).transform((v) => v.toUpperCase()),
    type: z.enum(['bus', 'van', 'mini-bus', 'auto']).default('bus'),
    capacity: z.coerce.number().int().min(1, 'Capacity kam se kam 1').max(100),
    driverName: z.string().trim().max(120).optional(),
    driverPhone: phone,
    helperName: z.string().trim().max(120).optional(),
    helperPhone: phone,
    insuranceExpiry: optDate,
    status: z.enum(['active', 'maintenance', 'inactive']).default('active'),
});
export const vehicleUpdateSchema = vehicleSchema.partial();

export const routeSchema = z.object({
    name: z.string().trim().min(2, 'Route ka naam chahiye').max(100),
    code: z.string().trim().min(1, 'Route code chahiye').max(20).transform((v) => v.toUpperCase()),
    vehicleId: optFk,
    monthlyFare: z.coerce.number().min(0).default(0),
    description: z.string().trim().max(255).optional(),
    status: z.enum(['active', 'inactive']).default('active'),
});
export const routeUpdateSchema = routeSchema.partial();

export const stopSchema = z.object({
    name: z.string().trim().min(2, 'Stop ka naam chahiye').max(120),
    pickupTime: optTime,
    dropTime: optTime,
    sortOrder: z.coerce.number().int().min(0).max(100).default(0),
});

export const stopUpdateSchema = stopSchema.partial();

export const assignSchema = z.object({
    studentId: z.coerce.number().int().positive({ message: 'Student chuniye' }),
    routeId: z.coerce.number().int().positive({ message: 'Route chuniye' }),
    stopId: z.coerce.number().int().positive({ message: 'Stop chuniye' }),
    startDate: optDate,
});

export const riderQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    routeId: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
});

/** routeId -> kitne students */
async function riderCounts(req, routeIds) {
    if (!routeIds.length) return {};
    const rows = await StudentTransport.findAll({
        attributes: ['routeId', [fn('COUNT', col('id')), 'n']],
        where: scopedWhere(req, { routeId: routeIds }),
        group: ['routeId'],
        raw: true,
    });
    return Object.fromEntries(rows.map((r) => [r.routeId, Number(r.n)]));
}

/** Vehicle kisi aur active route par to nahi laga - ek bus ek hi route chalti hai. */
async function assertVehicleFree(req, vehicleId, exceptRouteId, { requireActive = true } = {}) {
    if (!vehicleId) return null;
    const vehicle = await assertSameTenant(Vehicle, req, vehicleId, 'Vehicle');
    if (requireActive && vehicle.status !== 'active') {
        throw ApiError.badRequest('Ye vehicle ' + vehicle.status + ' me hai - route par nahi lag sakta', [
            { field: 'vehicleId', message: 'Active vehicle chuniye' },
        ]);
    }
    const other = await TransportRoute.findOne({
        where: scopedWhere(req, {
            vehicleId,
            status: 'active',
            ...(exceptRouteId ? { id: { [Op.ne]: exceptRouteId } } : {}),
        }),
    });
    if (other) {
        throw ApiError.conflict('Ye vehicle pehle se route ' + other.code + ' par laga hai', [
            { field: 'vehicleId', message: 'Doosra vehicle chuniye' },
        ]);
    }
    return vehicle;
}

/* ---------------- Vehicles ---------------- */

export const listVehicles = asyncHandler(async (req, res) => {
    const vehicles = await Vehicle.findAll({
        where: scopedWhere(req),
        include: [{ model: TransportRoute, as: 'routes', attributes: ['id', 'name', 'code', 'status'] }],
        order: [['regNo', 'ASC']],
    });
    const today = new Date().toISOString().slice(0, 10);
    res.json({
        success: true,
        data: vehicles.map((v) => {
            const route = v.routes?.find((r) => r.status === 'active') || null;
            return {
                ...v.toJSON(),
                routes: undefined,
                route: route ? { id: route.id, name: route.name, code: route.code } : null,
                insuranceExpired: Boolean(v.insuranceExpiry && v.insuranceExpiry < today),
            };
        }),
    });
});

const regClash = () =>
    ApiError.conflict('Ye vehicle pehle se registered hai', [
        { field: 'regNo', message: 'Registration number unique hona chahiye' },
    ]);

export const createVehicle = asyncHandler(async (req, res) => {
    const clash = await Vehicle.findOne({ where: scopedWhere(req, { regNo: req.body.regNo }) });
    if (clash) throw regClash();
    const v = await Vehicle.create({ ...req.body, schoolId: req.schoolId });
    res.status(201).json({ success: true, message: 'Vehicle add ho gaya', data: v });
});

export const updateVehicle = asyncHandler(async (req, res) => {
    const v = await findScoped(Vehicle, req, req.params.id);

    if (req.body.regNo && req.body.regNo !== v.regNo) {
        const clash = await Vehicle.findOne({
            where: scopedWhere(req, { regNo: req.body.regNo, id: { [Op.ne]: v.id } }),
        });
        if (clash) throw regClash();
    }

    // Capacity itni kam nahi ho sakti ki route ke students na samayein
    if (req.body.capacity !== undefined) {
        const route = await TransportRoute.findOne({
            where: scopedWhere(req, { vehicleId: v.id, status: 'active' }),
        });
        if (route) {
            const riders = (await riderCounts(req, [route.id]))[route.id] || 0;
            if (req.body.capacity < riders) {
                throw ApiError.badRequest(
                    'Route ' + route.code + ' par ' + riders + ' students hain - capacity usse kam nahi ho sakti',
                    [{ field: 'capacity', message: 'Kam se kam ' + riders }]
                );
            }
        }
    }

    await v.update(req.body);
    res.json({ success: true, message: 'Vehicle update ho gaya', data: v });
});

export const removeVehicle = asyncHandler(async (req, res) => {
    const v = await findScoped(Vehicle, req, req.params.id);
    const route = await TransportRoute.findOne({ where: scopedWhere(req, { vehicleId: v.id }) });
    if (route) throw ApiError.conflict('Ye vehicle route ' + route.code + ' par laga hai - pehle route se hataiye');
    await v.destroy();
    res.json({ success: true, message: 'Vehicle delete ho gaya' });
});

/* ---------------- Routes ---------------- */

const vehicleAttrs = ['id', 'regNo', 'type', 'capacity', 'driverName', 'driverPhone', 'status'];

export const listRoutes = asyncHandler(async (req, res) => {
    const routes = await TransportRoute.findAll({
        where: scopedWhere(req),
        include: [{ model: Vehicle, as: 'vehicle', attributes: vehicleAttrs }],
        order: [['code', 'ASC']],
    });
    const ids = routes.map((r) => r.id);
    const stops = ids.length
        ? await RouteStop.findAll({
              where: scopedWhere(req, { routeId: ids }),
              order: [['sortOrder', 'ASC'], ['pickupTime', 'ASC'], ['id', 'ASC']],
          })
        : [];
    const counts = await riderCounts(req, ids);

    res.json({
        success: true,
        data: routes.map((r) => {
            const riders = counts[r.id] || 0;
            const capacity = r.vehicle?.capacity ?? null;
            return {
                ...r.toJSON(),
                stops: stops.filter((s) => s.routeId === r.id),
                riders,
                seatsLeft: capacity === null ? null : Math.max(capacity - riders, 0),
            };
        }),
    });
});

const codeClash = () =>
    ApiError.conflict('Ye route code pehle se hai', [{ field: 'code', message: 'Code unique hona chahiye' }]);

export const createRoute = asyncHandler(async (req, res) => {
    const clash = await TransportRoute.findOne({ where: scopedWhere(req, { code: req.body.code }) });
    if (clash) throw codeClash();
    if ((req.body.status || 'active') === 'active') await assertVehicleFree(req, req.body.vehicleId);
    else if (req.body.vehicleId) await assertSameTenant(Vehicle, req, req.body.vehicleId, 'Vehicle');

    const route = await TransportRoute.create({ ...req.body, schoolId: req.schoolId });
    res.status(201).json({ success: true, message: 'Route ban gaya', data: route });
});

export const updateRoute = asyncHandler(async (req, res) => {
    const route = await findScoped(TransportRoute, req, req.params.id);

    if (req.body.code && req.body.code !== route.code) {
        const clash = await TransportRoute.findOne({
            where: scopedWhere(req, { code: req.body.code, id: { [Op.ne]: route.id } }),
        });
        if (clash) throw codeClash();
    }

    const vehicleId = req.body.vehicleId !== undefined ? req.body.vehicleId : route.vehicleId;
    const status = req.body.status || route.status;
    const riders = (await riderCounts(req, [route.id]))[route.id] || 0;

    if (status === 'active') {
        const vehicle = await assertVehicleFree(req, vehicleId, route.id, {
            requireActive: vehicleId !== route.vehicleId || route.status !== 'active',
        });
        if (riders && !vehicle) {
            throw ApiError.badRequest('Is route par ' + riders + ' students hain - vehicle hatana possible nahi', [
                { field: 'vehicleId', message: 'Vehicle chuniye' },
            ]);
        }
        if (vehicle && vehicle.capacity < riders) {
            throw ApiError.badRequest(
                'Vehicle ki capacity ' + vehicle.capacity + ' hai par route par ' + riders + ' students hain',
                [{ field: 'vehicleId', message: 'Badi capacity wala vehicle chuniye' }]
            );
        }
    } else {
        if (riders) throw ApiError.conflict('Is route par ' + riders + ' students hain - pehle unhe hataiye');
        if (vehicleId) await assertSameTenant(Vehicle, req, vehicleId, 'Vehicle');
    }

    await route.update(req.body);
    res.json({ success: true, message: 'Route update ho gaya', data: route });
});

export const removeRoute = asyncHandler(async (req, res) => {
    const route = await findScoped(TransportRoute, req, req.params.id);
    const riders = (await riderCounts(req, [route.id]))[route.id] || 0;
    if (riders) throw ApiError.conflict('Is route par ' + riders + ' students hain - pehle unhe hataiye');
    await route.destroy();
    res.json({ success: true, message: 'Route delete ho gaya' });
});

/* ---------------- Stops ---------------- */

export const addStop = asyncHandler(async (req, res) => {
    const route = await findScoped(TransportRoute, req, req.params.id);
    const clash = await RouteStop.findOne({ where: { routeId: route.id, name: req.body.name } });
    if (clash) {
        throw ApiError.conflict('Is route par ye stop pehle se hai', [
            { field: 'name', message: 'Stop ka naam unique hona chahiye' },
        ]);
    }
    const stop = await RouteStop.create({ ...req.body, routeId: route.id, schoolId: req.schoolId });
    res.status(201).json({ success: true, message: 'Stop add ho gaya', data: stop });
});

export const updateStop = asyncHandler(async (req, res) => {
    const stop = await findScoped(RouteStop, req, req.params.stopId);
    if (req.body.name && req.body.name !== stop.name) {
        const clash = await RouteStop.findOne({
            where: { routeId: stop.routeId, name: req.body.name, id: { [Op.ne]: stop.id } },
        });
        if (clash) throw ApiError.conflict('Is route par ye stop pehle se hai');
    }
    await stop.update(req.body);
    res.json({ success: true, message: 'Stop update ho gaya', data: stop });
});

export const removeStop = asyncHandler(async (req, res) => {
    const stop = await findScoped(RouteStop, req, req.params.stopId);
    const riders = await StudentTransport.count({ where: { stopId: stop.id } });
    if (riders) throw ApiError.conflict('Is stop se ' + riders + ' students aate hain - pehle unka stop badliye');
    await stop.destroy();
    res.json({ success: true, message: 'Stop delete ho gaya' });
});

/* ---------------- Students on routes ---------------- */

const riderIncludes = [
    {
        model: Student,
        as: 'student',
        attributes: ['id', 'admissionNo', 'firstName', 'lastName', 'rollNo', 'guardianPhone', 'classId', 'sectionId'],
        include: [
            { model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] },
            { model: Section, as: 'section', attributes: ['id', 'name'] },
        ],
    },
    { model: TransportRoute, as: 'route', attributes: ['id', 'name', 'code', 'monthlyFare'] },
    { model: RouteStop, as: 'stop', attributes: ['id', 'name', 'pickupTime', 'dropTime', 'sortOrder'] },
];

/**
 * Student ko route + stop par lagana (ya badalna). Route row lock hota hai
 * taaki do log ek saath last seat na le sakein.
 */
export const assignStudent = asyncHandler(async (req, res) => {
    const { studentId, routeId, stopId } = req.body;
    const student = await assertSameTenant(Student, req, studentId, 'Student');
    if (student.status !== 'active') throw ApiError.badRequest('Sirf active students ko transport diya ja sakta hai');

    const saved = await sequelize.transaction(async (t) => {
        const route = await TransportRoute.findOne({
            where: scopedWhere(req, { id: routeId }),
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!route) throw ApiError.notFound('Route not found');
        if (route.status !== 'active') throw ApiError.badRequest('Ye route inactive hai');
        if (!route.vehicleId) throw ApiError.badRequest('Is route par abhi koi vehicle nahi laga');

        const stop = await RouteStop.findOne({ where: { id: stopId, routeId: route.id }, transaction: t });
        if (!stop) {
            throw ApiError.badRequest('Ye stop is route ka nahi hai', [
                { field: 'stopId', message: 'Isi route ka stop chuniye' },
            ]);
        }

        const vehicle = await Vehicle.findByPk(route.vehicleId, { transaction: t });
        if (vehicle.status !== 'active') {
            throw ApiError.badRequest('Route ' + route.code + ' ki gaadi ' + vehicle.regNo + ' abhi ' + vehicle.status + ' me hai - pehle doosri gaadi lagaiye');
        }
        const existing = await StudentTransport.findOne({ where: { studentId }, transaction: t });
        const sameRoute = existing && existing.routeId === route.id;

        if (!sameRoute) {
            const riders = await StudentTransport.count({ where: { routeId: route.id }, transaction: t });
            if (riders >= vehicle.capacity) {
                throw ApiError.conflict(
                    'Route ' + route.code + ' full hai (' + riders + '/' + vehicle.capacity + ' seats)'
                );
            }
        }

        const values = {
            routeId: route.id,
            stopId: stop.id,
            startDate: req.body.startDate || new Date().toISOString().slice(0, 10),
        };
        if (existing) return existing.update(values, { transaction: t });
        return StudentTransport.create({ ...values, studentId, schoolId: req.schoolId }, { transaction: t });
    });

    const full = await StudentTransport.findByPk(saved.id, { include: riderIncludes });
    res.status(201).json({ success: true, message: 'Transport assign ho gaya', data: full });
});

export const unassignStudent = asyncHandler(async (req, res) => {
    const row = await StudentTransport.findOne({ where: scopedWhere(req, { studentId: req.params.studentId }) });
    if (!row) throw ApiError.notFound('Is student ka transport assigned nahi hai');
    await row.destroy();
    res.json({ success: true, message: 'Transport hata diya gaya' });
});

export const listRiders = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = scopedWhere(req);
    if (req.query.routeId) where.routeId = req.query.routeId;
    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [
            { '$student.first_name$': { [Op.like]: q } },
            { '$student.last_name$': { [Op.like]: q } },
            { '$student.admission_no$': { [Op.like]: q } },
            { '$stop.name$': { [Op.like]: q } },
        ];
    }

    const { rows, count } = await StudentTransport.findAndCountAll({
        where,
        include: riderIncludes,
        order: [['routeId', 'ASC'], [{ model: RouteStop, as: 'stop' }, 'sortOrder', 'ASC'], ['id', 'ASC']],
        limit,
        offset,
        subQuery: false,
        distinct: true,
    });
    res.json({ success: true, data: paginated({ rows, count, page, limit }) });
});

/** Transport page ke top cards. */
export const summary = asyncHandler(async (req, res) => {
    const [vehicles, routes, riders] = await Promise.all([
        Vehicle.findAll({ where: scopedWhere(req), attributes: ['id', 'capacity', 'status', 'insuranceExpiry'] }),
        TransportRoute.findAll({ where: scopedWhere(req), attributes: ['id', 'status', 'vehicleId', 'monthlyFare'] }),
        StudentTransport.count({ where: scopedWhere(req) }),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const activeRoutes = routes.filter((r) => r.status === 'active' && r.vehicleId);
    const seats = activeRoutes.reduce((s, r) => s + (vehicles.find((v) => v.id === r.vehicleId)?.capacity || 0), 0);
    const counts = await riderCounts(req, activeRoutes.map((r) => r.id));
    const monthly = activeRoutes.reduce((s, r) => s + Number(r.monthlyFare) * (counts[r.id] || 0), 0);

    res.json({
        success: true,
        data: {
            vehicles: vehicles.length,
            inMaintenance: vehicles.filter((v) => v.status === 'maintenance').length,
            insuranceExpired: vehicles.filter((v) => v.insuranceExpiry && v.insuranceExpiry < today).length,
            routes: routes.length,
            activeRoutes: activeRoutes.length,
            riders,
            seats,
            seatsLeft: Math.max(seats - riders, 0),
            monthlyFare: Math.round(monthly * 100) / 100,
        },
    });
});

/** Mobile app - student ki bus, stop, timing aur driver ka number. */
export async function forStudent(req, studentId) {
    const row = await StudentTransport.findOne({
        where: scopedWhere(req, { studentId }),
        include: [
            {
                model: TransportRoute,
                as: 'route',
                attributes: ['id', 'name', 'code', 'monthlyFare', 'vehicleId'],
                include: [
                    {
                        model: Vehicle,
                        as: 'vehicle',
                        attributes: ['regNo', 'type', 'driverName', 'driverPhone', 'helperName', 'helperPhone'],
                    },
                ],
            },
            { model: RouteStop, as: 'stop', attributes: ['id', 'name', 'pickupTime', 'dropTime'] },
        ],
    });
    if (!row) return null;
    const stops = await RouteStop.findAll({
        where: { routeId: row.routeId },
        attributes: ['id', 'name', 'pickupTime', 'dropTime'],
        order: [['sortOrder', 'ASC'], ['pickupTime', 'ASC'], ['id', 'ASC']],
    });
    const { vehicle, ...route } = row.route.toJSON();
    return { route, vehicle: vehicle || null, stop: row.stop, stops, startDate: row.startDate };
}
