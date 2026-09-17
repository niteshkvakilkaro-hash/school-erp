/** Express 4 async errors ko khud forward nahi karta — isliye ye wrapper. */
export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
