// -----------------------------------------------------------------------------
// asyncHandler.js
//
// Express 4 does not catch rejected promises from an async route handler, so an
// unhandled rejection would crash the process instead of returning a clean
// error envelope. Wrapping each async controller in asyncHandler() forwards any
// thrown/rejected error to the global errorHandler.
//
//     router.post('/login', asyncHandler(login));
// -----------------------------------------------------------------------------

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
