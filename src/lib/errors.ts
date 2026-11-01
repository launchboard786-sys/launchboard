/** An error that is safe to show to the user, with an HTTP status. */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (msg: string, code = "BAD_REQUEST") => new AppError(400, code, msg);
export const unauthorized = (msg = "Please log in to continue.") => new AppError(401, "UNAUTHORIZED", msg);
export const forbidden = (msg = "You don't have permission to do that.") => new AppError(403, "FORBIDDEN", msg);
export const notFound = (msg = "Not found.") => new AppError(404, "NOT_FOUND", msg);
export const conflict = (msg: string, code = "CONFLICT") => new AppError(409, code, msg);
export const tooMany = (msg = "Too many attempts. Please wait a minute and try again.") =>
  new AppError(429, "RATE_LIMITED", msg);
