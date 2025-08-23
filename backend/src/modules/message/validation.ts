import Joi from 'joi';

export const sendMessageSchema = Joi.object({
  content: Joi.string(),
  attachments: Joi.array().items(Joi.string()).max(2),
  receiver: Joi.string().required(),
})
  .or('content', 'attachments')
  .required()
  .messages({
    'object.missing': 'Either content or attachments is required',
  });
