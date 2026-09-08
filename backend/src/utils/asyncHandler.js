// Express 4 doesn't catch a rejected promise from an async handler, so without
// this wrapper a thrown error crashes the process instead of reaching the global
// error handler.  Usage: router.post('/login', asyncHandler(login));

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
