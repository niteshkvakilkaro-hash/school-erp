import ApiError from '../utils/ApiError.js';

/**
 * validate({ body: schema, query: schema, params: schema })
 * Zod se parse karke sanitized value wapas req par likh dete hain.
 */
export const validate = (schemas) => (req, _res, next) => {
    for (const key of ['body', 'query', 'params']) {
        const schema = schemas[key];
        if (!schema) continue;

        const result = schema.safeParse(req[key]);
        if (!result.success) {
            const details = result.error.issues.map((i) => ({
                field: i.path.join('.'),
                message: i.message,
            }));
            return next(ApiError.badRequest('Validation failed', details));
        }
        if (key === 'query') {
            // Express 5 me req.query getter-only hota hai — isliye assign ki jagah defineProperty.
            Object.defineProperty(req, 'query', { value: result.data, writable: true });
        } else {
            req[key] = result.data;
        }
    }
    next();
};
