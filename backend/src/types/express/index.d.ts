// This file extends the Express Request type to include the user property

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email?: string;
        phone?: string;
      };
    }
  }
}

export {}; // This file needs to be a module
