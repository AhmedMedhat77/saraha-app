/**
 * @param length default is 5
 * @returns OTP of length and expiry time in ms
 */

export function generateOTP(length: number = 5 , expiryTime: number = 60 * 60 * 1000) {
  const characters = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  const otpExpiry = new Date(Date.now() + expiryTime);
  return { otp, otpExpiry };
}
