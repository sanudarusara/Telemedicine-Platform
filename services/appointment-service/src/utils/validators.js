const Joi = require('joi');

const validateAppointment = (data) => {
    const schema = Joi.object({
        patientId: Joi.string().required(),
        doctorId: Joi.string().required(),
        date: Joi.date().required().min('now'),
        timeSlot: Joi.string().required(),
        consultationType: Joi.string().valid('video', 'clinic'),
        symptoms: Joi.string().max(500),
        notes: Joi.string().max(500),
        paymentAmount: Joi.number().min(0)
    });
    
    return schema.validate(data);
};

const validateStatusUpdate = (data) => {
    const schema = Joi.object({
        status: Joi.string().valid('confirmed', 'cancelled', 'completed').required(),
        notes: Joi.string().max(500)
    });
    
    return schema.validate(data);
};

const validateReschedule = (data) => {
    const schema = Joi.object({
        newDate: Joi.date().required().min('now'),
        newTimeSlot: Joi.string().required(),
        reason: Joi.string().max(500)
    });
    
    return schema.validate(data);
};

const validateSearch = (data) => {
    const schema = Joi.object({
        specialty: Joi.string().optional(),
        name: Joi.string().optional(),
        date: Joi.date().optional()
    });
    
    return schema.validate(data);
};

module.exports = {
    validateAppointment,
    validateStatusUpdate,
    validateReschedule,
    validateSearch
};
