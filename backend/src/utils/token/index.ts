import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import config from '../../config';

const generateToken = (
  payload: string | object | Buffer,
  options?: SignOptions,
  tokenSecret?: string,
): string => {
  const token = jwt.sign(payload, tokenSecret || config.tokenSecret, {
    ...options,
  });
  return token;
};

const verifyToken = async (
  token: string,
  tokenSecret?: string,
): Promise<
  | JwtPayload
  | string
  | null
  | { user: { _id: string; email?: string; phone?: string } }
> => {
  try {
    const decoded = jwt.verify(token, tokenSecret || config.tokenSecret);
    return decoded;
  } catch (error) {
    return null;
  }
};

export { generateToken, verifyToken };
