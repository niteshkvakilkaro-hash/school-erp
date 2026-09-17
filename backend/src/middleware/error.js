import { isProd } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export const notFoundHandler = (req, _res, next) => {
    next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler = (err, _req, res, _next) => {
    let error = err;

    // Sequelize column names snake_case hote hain - UI camelCase field expect karta hai
    const toCamel = (s) => String(s).replace(/_([a-z])/g, (_, c) => c.toUpperCase());

    // Sequelize errors ko readable API errors me badal dete hain
    if (err?.name === 'SequelizeUniqueConstraintError') {
        const details = (err.errors || []).map((e) => ({
            field: toCamel(e.path),
            message: toCamel(e.path) + ' already exists',
        }));
        error = ApiError.conflict('Duplicate value', details);
    } else if (err?.name === 'SequelizeValidationError') {
        const details = (err.errors || []).map((e) => ({ field: toCamel(e.path), message: e.message }));
        error = ApiError.badRequest('Validation failed', details);
    } else if (err?.name === 'SequelizeForeignKeyConstraintError') {
        error = ApiError.badRequest('Linked record not found or still in use');
    }

    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) console.error(err);

    res.status(statusCode).json({
        success: false,
        message: error.message || 'Something went wrong',
        ...(error.details ? { errors: error.details } : {}),
        ...(isProd || statusCode < 500 ? {} : { stack: err.stack }),
    });
};
