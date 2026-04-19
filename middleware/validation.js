const Joi = require('joi');

const schemas = {
    sn: Joi.string()
        .min(1)
        .max(50)
        .pattern(/^[a-zA-Z0-9\-]+$/)
        .required()
        .messages({
            'string.pattern.base': 'S/N debe contener solo letras, números y guiones'
        }),

    pin: Joi.string()
        .pattern(/^\d{10}$/)
        .required()
        .messages({
            'string.pattern.base': 'PIN debe contener 10 dígitos'
        })
};

function validate(data, schema) {
    return schema.validate(data, { abortEarly: false });
}

module.exports = {
    schemas,
    validate
};