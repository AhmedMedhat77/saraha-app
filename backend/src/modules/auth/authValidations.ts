import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().messages({
    'string.email': 'Invalid email',
  }),

  phone: Joi.string().messages({
    'string.base': 'Invalid phone',
  }),

  platform: Joi.string().valid('local', 'google').required().messages({
    'string.empty': 'Platform is required',
  }),

  password: Joi.string().required().min(6).messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
  }),
})
  .or('email', 'phone')
  .messages({
    'object.missing': 'Either email or phone is required',
  });

export const registerWithGoogleSchema = Joi.object({
  tokenId: Joi.string().required().messages({
    'string.empty': 'Token is required',
  }),
});

export const forgetPasswordSchema = Joi.object({
  email: Joi.string().email().messages({
    'string.email': 'Invalid email',
  }),
});

export const resetPasswordSchema = Joi.object({
  resetToken: Joi.string().required().messages({
    'string.empty': 'Reset token is required',
  }),
  password: Joi.string().required().min(6).messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
  }),
});

export const registerSchema = Joi.object({
  firstName: Joi.string().required().messages({
    'string.empty': 'First name is required',
  }),
  lastName: Joi.string().required().messages({
    'string.empty': 'Last name is required',
  }),
  email: Joi.string().email().messages({
    'string.email': 'Invalid email',
  }),
  dob: Joi.date().required().messages({
    'date.empty': 'Date of birth is required',
  }),
  password: Joi.string().required().min(6).messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
  }),
  phone: Joi.string().messages({
    'string.base': 'Invalid phone',
  }),
  platform: Joi.string().required().messages({
    'string.empty': 'Platform is required',
  }),
}).or('email', 'phone');

export const changePasswordValidation = Joi.object({
  oldPassword: Joi.string().required().messages({
    'string.empty': 'have to pass old password',
  }),
  newPassword: Joi.string().required().min(6).messages({
    'string.empty': 'have to pass old password',
    'string.min': 'Password must be at least 6 characters long',
  }),
});
