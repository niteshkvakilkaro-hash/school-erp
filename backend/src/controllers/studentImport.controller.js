import multer from 'multer';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { readSheet, analyse, commit, buildTemplate } from '../services/studentImport.js';
import { logEvent } from '../services/audit.js';

const sheetUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        if (/\.(xlsx|csv|xls)$/i.test(file.originalname || '')) return cb(null, true);
        cb(ApiError.badRequest('Sirf .xlsx ya .csv file chalegi'));
    },
}).single('file');

export function uploadSheet(req, res, next) {
    sheetUpload(req, res, (err) => {
        if (!err) return next();
        if (err instanceof ApiError) return next(err);
        if (err.code === 'LIMIT_FILE_SIZE') return next(ApiError.badRequest('File 5 MB se chhoti honi chahiye'));
        return next(ApiError.badRequest('Upload nahi ho paaya: ' + err.message));
    });
}

const flag = (v) => v === true || v === 'true' || v === '1' || v === 'on';

async function analyseRequest(req) {
    if (!req.file) throw ApiError.badRequest('Excel / CSV file chuniye');
    const parsed = await readSheet(req.file);
    return analyse(req.schoolId, parsed, { createParentLogins: flag(req.body.createParentLogins) });
}

const shapeRow = (r) => ({
    row: r.row,
    name: [r.data.firstName, r.data.lastName].filter(Boolean).join(' '),
    admissionNo: r.data.admissionNo,
    className: r.data.className,
    sectionName: r.data.sectionName || null,
    guardianPhone: r.data.guardianPhone || null,
    fatherName: r.data.fatherName,
    errors: r.errors,
    warnings: r.warnings,
});

/** Kuch save nahi hota - sirf batata hai kya import hoga aur kahan galti hai. */
export const preview = asyncHandler(async (req, res) => {
    const a = await analyseRequest(req);
    res.json({ success: true, data: { summary: a.summary, unknownColumns: a.unknownColumns, rows: a.rows.map(shapeRow) } });
});

/** Wahi file dobara - server phir se jaanchta hai, phir ek transaction me sab ya kuch nahi. */
export const importStudents = asyncHandler(async (req, res) => {
    const a = await analyseRequest(req);
    const result = await commit(req.schoolId, a, { skipErrors: flag(req.body.skipErrors) });
    logEvent({ action: 'student.import', module: 'Students', entity: 'import', summary: 'Excel se ' + result.created + ' students import (' + (req.file.originalname || '').slice(0, 80) + ')' + (result.parentsCreated ? ', ' + result.parentsCreated + ' parent login' : '') + (result.skipped ? ', ' + result.skipped + ' rows chhodi' : '') });
    res.status(201).json({
        success: true,
        message: result.created + ' students import ho gaye' + (result.parentsCreated ? ', ' + result.parentsCreated + ' parent login bane' : ''),
        data: result,
    });
});

export const template = asyncHandler(async (req, res) => {
    const buf = await buildTemplate(req.schoolId);
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', 'attachment; filename="students-import-template.xlsx"');
    res.set('Cache-Control', 'no-store');
    res.send(Buffer.from(buf));
});
