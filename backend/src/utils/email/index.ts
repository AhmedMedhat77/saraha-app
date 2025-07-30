import nodemailer from 'nodemailer';
import { AppError } from '../error/AppError';
import config from '../../config';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.emailUser,
    pass: config.emailPassword,
  },
});

interface SendEmailProps {
  from?: string;
  to: string;
  subject: string;
  text: string;
}
export const sendEmail = async ({
  from,
  to,
  subject,
  text,
}: SendEmailProps) => {
  try {
    const mailOptions = {
      from: from || `'Saraha App' ${config.emailUser}`,
      to,
      subject,
      text,
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    if (error instanceof Error) {
      throw new AppError(error.message, 500);
    }
    throw new AppError('Failed to send email', 500);
  }
};
