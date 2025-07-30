import {JwtPayload} from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload; // Adjust based on your actual use case
    }
  }
}
