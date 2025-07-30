import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import config from '../../config';

const generateToken = (
  payload: string | object | Buffer,
  options?: SignOptions,
): string => {
  const token = jwt.sign(payload, config.tokenSecret, {
    ...options,
  });
  return token;
};

const verifyToken = async (
  token: string,
): Promise<JwtPayload | string | null> => {
  try {
    const decoded = jwt.verify(token, config.tokenSecret);
    return decoded;
  } catch (error) {
    return null;
  }
};

export { generateToken, verifyToken };
