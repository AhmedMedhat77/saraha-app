import Joi from 'joi';

// Common validation patterns
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const phonePattern = /^\+?[1-9]\d{1,14}$/;

// Base user fields
const baseUserFields = {
  firstName: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .required()
    .messages({
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
    }),
  lastName: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .required()
    .messages({
      'string.empty': 'Last name is required',
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
    }),
};

// Login schema
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  phone: Joi.string()
    .pattern(phonePattern)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  password: Joi.string()
    .when('platform', {
      is: 'local',
      then: Joi.required().messages({
        'any.required': 'Password is required for local login',
      }),
      otherwise: Joi.optional(),
    })
    .min(6)
    .messages({
      'string.min': 'Password must be at least 6 characters long',
    }),
  platform: Joi.string()
    .valid('local', 'google')
    .required()
    .messages({
      'any.only': 'Platform must be either "local" or "google"',
      'any.required': 'Platform is required',
    }),
  googleId: Joi.string()
    .when('platform', {
      is: 'google',
      then: Joi.required().messages({
        'any.required': 'Google ID is required for Google login',
      }),
      otherwise: Joi.optional(),
    }),
})
  .or('email', 'phone')
  .messages({
    'object.missing': 'Either email or phone is required',
  });

// Registration schema
export const registerSchema = Joi.object({
  ...baseUserFields,
  email: Joi.string()
    .email()
    .messages({
      'string.email': 'Please provide a valid email address',
    }),
  phone: Joi.string()
    .pattern(phonePattern)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
  password: Joi.string()
    .when('platform', {
      is: 'local',
      then: Joi.required().messages({
        'any.required': 'Password is required for local registration',
      }),
      otherwise: Joi.optional(),
    })
    .min(6)
    .pattern(passwordPattern)
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
  dob: Joi.date()
    .max('now')
    .required()
    .messages({
      'date.base': 'Please provide a valid date of birth',
      'date.max': 'Date of birth cannot be in the future',
      'any.required': 'Date of birth is required',
    }),
  platform: Joi.string()
    .valid('local', 'google')
    .required()
    .messages({
      'any.only': 'Platform must be either "local" or "google"',
      'any.required': 'Platform is required',
    }),
})
  .or('email', 'phone')
  .messages({
    'object.missing': 'Either email or phone is required for registration',
  });

// Google registration schema
export const registerWithGoogleSchema = Joi.object({
  idToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'Google ID token is required',
      'any.required': 'Google ID token is required',
    }),
});

// Account verification schema
export const verifyAccountSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  otp: Joi.string()
    .length(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.length': 'OTP must be exactly 6 digits',
      'string.pattern.base': 'OTP must contain only numbers',
      'any.required': 'OTP is required',
    }),
});

// Resend OTP schema
export const resendOTPSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
});

// Forgot password schema
export const forgetPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
});

// Reset password schema
export const resetPasswordSchema = Joi.object({
  resetToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required',
      'any.required': 'Reset token is required',
    }),
  password: Joi.string()
    .min(6)
    .pattern(passwordPattern)
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 6 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required',
    }),
});

// Change password schema
export const changePasswordValidation = Joi.object({
  oldPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required',
      'any.required': 'Current password is required',
    }),
  newPassword: Joi.string()
    .min(6)
    .pattern(passwordPattern)
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 6 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required',
    }),
});

// Logout schema
export const logoutSchema = Joi.object({
  allDevices: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'allDevices must be a boolean value',
    }),
});
