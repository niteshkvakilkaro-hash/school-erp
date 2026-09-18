import { z } from 'zod';
import { Op, fn, col } from 'sequelize';
import { sequelize, Book, BookIssue, Student, SchoolClass, Section, User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginated } from '../utils/pagination.js';
import { scopedWhere, findScoped, assertSameTenant } from '../utils/tenant.js';

// Library ke niyam - baad me school settings me le ja sakte hain
export const RULES = {
    loanDays: 14,
    finePerDay: 2,
    maxBooksPerStudent: 3,
};

const dateStr = z.coerce.date().transform((d) => d.toISOString().slice(0, 10));
const today = () => new Date().toISOString().slice(0, 10);
const money = (v) => Math.round(Number(v || 0) * 100) / 100;

const daysBetween = (from, to) =>
    Math.round((new Date(to + 'T00:00:00Z') - new Date(from + 'T00:00:00Z')) / 86400000);

/** Due date ke baad har din ka fine. Return ho chuki ho to returnedOn tak. */
export function fineFor(issue, asOf = today()) {
    const end = issue.returnedOn || asOf;
    const late = daysBetween(issue.dueOn, end);
    return late > 0 ? late * RULES.finePerDay : 0;
}

const optionalFk = z
    .preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.number().int().positive().nullable()
    )
    .optional();

export const bookSchema = z.object({
    title: z.string().trim().min(2, 'Book ka title chahiye').max(200),
    author: z.string().trim().max(160).optional(),
    publisher: z.string().trim().max(160).optional(),
    isbn: z.string().trim().max(20).optional(),
    code: z
        .string()
        .trim()
        .min(1, 'Book code chahiye')
        .max(30)
        .transform((v) => v.toUpperCase()),
    category: z.string().trim().max(60).optional(),
    classId: optionalFk,
    totalCopies: z.coerce.number().int().min(1, 'Kam se kam 1 copy').max(1000),
    shelf: z.string().trim().max(30).optional(),
    price: z
        .preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().min(0))
        .optional(),
    status: z.enum(['active', 'inactive']).default('active'),
});

export const bookUpdateSchema = bookSchema.partial();

export const bookQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().trim().optional(),
    category: z.string().trim().optional(),
    availability: z.enum(['available', 'issued']).optional(),
});

export const issueSchema = z.object({
    bookId: z.coerce.number().int().positive({ message: 'Book chuniye' }),
    studentId: optionalFk,
    userId: optionalFk,
    issuedOn: dateStr.optional(),
    dueOn: dateStr.optional(),
    remarks: z.string().trim().max(255).optional(),
});

export const returnSchema = z.object({
    returnedOn: dateStr.optional(),
    finePaid: z.coerce.boolean().default(false),
    remarks: z.string().trim().max(255).optional(),
});

export const issueQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(['issued', 'overdue', 'returned']).optional(),
    studentId: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
});

/** Har book ki abhi kitni copies bahar hain - ek hi query me. */
async function outCounts(req, bookIds) {
    if (!bookIds.length) return {};
    const rows = await BookIssue.findAll({
        attributes: ['bookId', [fn('COUNT', col('id')), 'out']],
        where: scopedWhere(req, { bookId: bookIds, returnedOn: null }),
        group: ['bookId'],
        raw: true,
    });
    return Object.fromEntries(rows.map((r) => [r.bookId, Number(r.out)]));
}

/* ---------------- Books ---------------- */

export const listBooks = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);

    const where = scopedWhere(req);
    if (req.query.category) where.category = req.query.category;
    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [
            { title: { [Op.like]: q } },
            { author: { [Op.like]: q } },
            { code: { [Op.like]: q } },
            { isbn: { [Op.like]: q } },
        ];
    }

    const { rows, count } = await Book.findAndCountAll({
        where,
        include: [{ model: SchoolClass, as: 'schoolClass', attributes: ['id', 'name'] }],
        order: [['title', 'ASC']],
        limit,
        offset,
        subQuery: false,
    });

    const out = await outCounts(req, rows.map((b) => b.id));
    let items = rows.map((b) => {
        const issued = out[b.id] || 0;
        return { ...b.toJSON(), issued, available: Math.max(0, b.totalCopies - issued) };
    });

    // Availability issues se derive hoti hai, isliye filter bhi baad me
    if (req.query.availability === 'available') items = items.filter((b) => b.available > 0);
    if (req.query.availability === 'issued') items = items.filter((b) => b.issued > 0);

    res.json({ success: true, data: paginated({ rows: items, count, page, limit }) });
});

export const categories = asyncHandler(async (req, res) => {
    const rows = await Book.findAll({
        attributes: [[fn('DISTINCT', col('category')), 'category']],
        where: scopedWhere(req, { category: { [Op.ne]: null } }),
        raw: true,
    });
    res.json({ success: true, data: rows.map((r) => r.category).filter(Boolean).sort() });
});

export const createBook = asyncHandler(async (req, res) => {
    await assertSameTenant(SchoolClass, req, req.body.classId, 'Class');

    const clash = await Book.findOne({ where: scopedWhere(req, { code: req.body.code }) });
    if (clash) throw ApiError.conflict('Is code ki book pehle se hai', [{ field: 'code', message: 'Code unique hona chahiye' }]);

    const book = await Book.create({ ...req.body, schoolId: req.schoolId });
    res.status(201).json({ success: true, message: 'Book add ho gayi', data: book });
});

export const updateBook = asyncHandler(async (req, res) => {
    const book = await findScoped(Book, req, req.params.id);
    await assertSameTenant(SchoolClass, req, req.body.classId, 'Class');

    if (req.body.code && req.body.code !== book.code) {
        const clash = await Book.findOne({
            where: scopedWhere(req, { code: req.body.code, id: { [Op.ne]: book.id } }),
        });
        if (clash) throw ApiError.conflict('Is code ki book pehle se hai', [{ field: 'code', message: 'Code unique hona chahiye' }]);
    }

    // Copies itni kam nahi kar sakte ki bahar gayi copies se kam ho jayein
    if (req.body.totalCopies !== undefined) {
        const out = (await outCounts(req, [book.id]))[book.id] || 0;
        if (req.body.totalCopies < out) {
            throw ApiError.badRequest(out + ' copies abhi issued hain - total usse kam nahi ho sakta', [
                { field: 'totalCopies', message: 'Kam se kam ' + out },
            ]);
        }
    }

    await book.update(req.body);
    res.json({ success: true, message: 'Book update ho gayi', data: book });
});

export const removeBook = asyncHandler(async (req, res) => {
    const book = await findScoped(Book, req, req.params.id);

    const out = (await outCounts(req, [book.id]))[book.id] || 0;
    if (out > 0) throw ApiError.conflict(out + ' copies abhi issued hain - pehle wapas lijiye');

    await book.destroy();
    res.json({ success: true, message: 'Book delete ho gayi' });
});

/* ---------------- Issue / return ---------------- */

const issueIncludes = [
    { model: Book, as: 'book', attributes: ['id', 'title', 'code', 'author'] },
    {
        model: Student,
        as: 'student',
        attributes: ['id', 'admissionNo', 'firstName', 'lastName'],
        include: [
            { model: SchoolClass, as: 'schoolClass', attributes: ['name'] },
            { model: Section, as: 'section', attributes: ['name'] },
        ],
    },
    { model: User, as: 'borrower', attributes: ['id', 'name'] },
    { model: User, as: 'issuedBy', attributes: ['id', 'name'] },
];

function shapeIssue(i, d = today()) {
    const s = i.student;
    const overdue = !i.returnedOn && i.dueOn < d;
    return {
        id: i.id,
        issuedOn: i.issuedOn,
        dueOn: i.dueOn,
        returnedOn: i.returnedOn,
        status: i.returnedOn ? 'returned' : overdue ? 'overdue' : 'issued',
        daysLate: Math.max(0, daysBetween(i.dueOn, i.returnedOn || d)),
        // Return ho chuki ho to frozen fine, warna aaj tak ka
        fine: i.returnedOn ? money(i.fine) : fineFor(i, d),
        finePaid: i.finePaid,
        remarks: i.remarks,
        book: i.book ? { id: i.book.id, title: i.book.title, code: i.book.code, author: i.book.author } : null,
        borrower: s
            ? {
                  type: 'student',
                  id: s.id,
                  name: [s.firstName, s.lastName].filter(Boolean).join(' '),
                  ref: s.admissionNo,
                  className: (s.schoolClass?.name || '') + (s.section ? ' - ' + s.section.name : ''),
              }
            : i.borrower
              ? { type: 'staff', id: i.borrower.id, name: i.borrower.name, ref: 'Staff', className: null }
              : null,
        issuedBy: i.issuedBy?.name || null,
    };
}

/**
 * Issue karte waqt teen cheezein check hoti hain, aur teeno transaction ke
 * andar row lock ke saath - warna do log ek saath aakhri copy issue kar sakte:
 *  1. copy available hai
 *  2. student ki limit poori nahi hui
 *  3. usi student ke paas ye book pehle se to nahi
 */
export const issue = asyncHandler(async (req, res) => {
    const { bookId, studentId, userId, remarks } = req.body;

    if (!studentId === !userId) {
        throw ApiError.badRequest('Book student ya staff - dono me se ek ko hi issue hoti hai');
    }

    const issuedOn = req.body.issuedOn || today();
    const dueOn = req.body.dueOn || new Date(Date.parse(issuedOn) + RULES.loanDays * 86400000).toISOString().slice(0, 10);
    if (dueOn < issuedOn) {
        throw ApiError.badRequest('Due date issue date se pehle nahi ho sakti', [
            { field: 'dueOn', message: 'Issue date ke baad ki date chuniye' },
        ]);
    }

    if (studentId) await assertSameTenant(Student, req, studentId, 'Student');
    if (userId) await assertSameTenant(User, req, userId, 'Staff');

    const created = await sequelize.transaction(async (t) => {
        // Book row lock - concurrent issue ek ke baad ek chalenge
        const book = await Book.findOne({
            where: scopedWhere(req, { id: bookId }),
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!book) throw ApiError.notFound('Book not found');
        if (book.status !== 'active') throw ApiError.badRequest('Ye book inactive hai');

        const out = await BookIssue.count({ where: { bookId, returnedOn: null }, transaction: t });
        if (out >= book.totalCopies) {
            throw ApiError.conflict('Is book ki saari ' + book.totalCopies + ' copies abhi issued hain');
        }

        if (studentId) {
            const holding = await BookIssue.count({
                where: { schoolId: req.schoolId, studentId, returnedOn: null },
                transaction: t,
            });
            if (holding >= RULES.maxBooksPerStudent) {
                throw ApiError.conflict(
                    'Is student ke paas pehle se ' + holding + ' books hain (limit ' + RULES.maxBooksPerStudent + ')'
                );
            }
        }

        const dup = await BookIssue.findOne({
            where: {
                bookId,
                returnedOn: null,
                ...(studentId ? { studentId } : { userId }),
            },
            transaction: t,
        });
        if (dup) throw ApiError.conflict('Ye book pehle se isi ke paas hai');

        return BookIssue.create(
            {
                schoolId: req.schoolId,
                bookId,
                studentId: studentId || null,
                userId: userId || null,
                issuedOn,
                dueOn,
                remarks: remarks || null,
                issuedById: req.user.id,
            },
            { transaction: t }
        );
    });

    const full = await BookIssue.findByPk(created.id, { include: issueIncludes });
    res.status(201).json({ success: true, message: 'Book issue ho gayi - due ' + dueOn, data: shapeIssue(full) });
});

/** Return par fine us din ka calculate hokar freeze ho jata hai. */
export const returnBook = asyncHandler(async (req, res) => {
    const record = await findScoped(BookIssue, req, req.params.id);
    if (record.returnedOn) throw ApiError.badRequest('Ye book pehle hi wapas aa chuki hai');

    const returnedOn = req.body.returnedOn || today();
    if (returnedOn < record.issuedOn) {
        throw ApiError.badRequest('Return date issue date se pehle nahi ho sakti', [
            { field: 'returnedOn', message: 'Issue date ke baad ki date chuniye' },
        ]);
    }

    const fine = fineFor({ dueOn: record.dueOn, returnedOn });
    await record.update({
        returnedOn,
        fine,
        // Fine hi nahi hai to "paid" ka sawal nahi
        finePaid: fine > 0 ? req.body.finePaid : true,
        remarks: req.body.remarks ?? record.remarks,
    });

    const full = await BookIssue.findByPk(record.id, { include: issueIncludes });
    res.json({
        success: true,
        message: fine > 0 ? 'Book wapas aa gayi - fine Rs ' + fine : 'Book wapas aa gayi',
        data: shapeIssue(full),
    });
});

export const markFinePaid = asyncHandler(async (req, res) => {
    const record = await findScoped(BookIssue, req, req.params.id);
    if (!record.returnedOn) throw ApiError.badRequest('Pehle book wapas lijiye, fine tabhi final hota hai');
    if (Number(record.fine) <= 0) throw ApiError.badRequest('Is issue par koi fine nahi hai');

    await record.update({ finePaid: true });
    res.json({ success: true, message: 'Fine paid mark ho gaya' });
});

export const listIssues = asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const d = today();

    const where = scopedWhere(req);
    if (req.query.studentId) where.studentId = req.query.studentId;
    if (req.query.status === 'returned') where.returnedOn = { [Op.ne]: null };
    if (req.query.status === 'issued') {
        where.returnedOn = null;
        where.dueOn = { [Op.gte]: d };
    }
    if (req.query.status === 'overdue') {
        where.returnedOn = null;
        where.dueOn = { [Op.lt]: d };
    }
    if (req.query.search) {
        const q = '%' + req.query.search + '%';
        where[Op.or] = [
            { '$book.title$': { [Op.like]: q } },
            { '$book.code$': { [Op.like]: q } },
            { '$student.first_name$': { [Op.like]: q } },
            { '$student.admission_no$': { [Op.like]: q } },
        ];
    }

    const { rows, count } = await BookIssue.findAndCountAll({
        where,
        include: issueIncludes,
        order: [
            // Pehle jo bahar hain (sabse purani due pehle), phir returned
            [sequelize.literal('returned_on IS NULL'), 'DESC'],
            ['dueOn', 'ASC'],
            ['id', 'DESC'],
        ],
        limit,
        offset,
        subQuery: false,
        distinct: true,
    });

    res.json({ success: true, data: paginated({ rows: rows.map((i) => shapeIssue(i, d)), count, page, limit }) });
});

/** Library ke top cards - ek jagah se. */
export async function librarySnapshot(req) {
    const d = today();
    const [titles, copiesRow, out, overdue, unpaid] = await Promise.all([
        Book.count({ where: scopedWhere(req, { status: 'active' }) }),
        Book.findOne({
            attributes: [[fn('SUM', col('total_copies')), 'total']],
            where: scopedWhere(req, { status: 'active' }),
            raw: true,
        }),
        BookIssue.count({ where: scopedWhere(req, { returnedOn: null }) }),
        BookIssue.findAll({
            where: scopedWhere(req, { returnedOn: null, dueOn: { [Op.lt]: d } }),
            attributes: ['dueOn', 'returnedOn'],
        }),
        BookIssue.findOne({
            attributes: [[fn('SUM', col('fine')), 'total']],
            where: scopedWhere(req, { finePaid: false, returnedOn: { [Op.ne]: null } }),
            raw: true,
        }),
    ]);

    const copies = Number(copiesRow?.total || 0);
    // Overdue ka fine abhi chal raha hai - aaj tak ka jod
    const accruing = overdue.reduce((sum, i) => sum + fineFor(i, d), 0);

    return {
        titles,
        copies,
        issued: out,
        available: Math.max(0, copies - out),
        overdue: overdue.length,
        finesUnpaid: money(unpaid?.total),
        finesAccruing: money(accruing),
        rules: RULES,
    };
}

export const summary = asyncHandler(async (req, res) => {
    res.json({ success: true, data: await librarySnapshot(req) });
});

/** Mobile app - student ke paas abhi kaunsi books hain aur history. */
export async function forStudent(req, studentId) {
    const d = today();
    const rows = await BookIssue.findAll({
        where: scopedWhere(req, { studentId }),
        include: [{ model: Book, as: 'book', attributes: ['id', 'title', 'code', 'author'] }],
        order: [['issuedOn', 'DESC']],
        limit: 30,
    });
    const items = rows.map((i) => shapeIssue(i, d));
    return {
        current: items.filter((i) => i.status !== 'returned'),
        history: items.filter((i) => i.status === 'returned'),
        rules: RULES,
    };
}
