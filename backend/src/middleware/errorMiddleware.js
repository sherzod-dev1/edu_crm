const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(' [Error Middleware]:', err);

  // Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = err.errors ? err.errors.map(e => e.message).join(', ') : 'Duplicate field value entered';
    return errorResponse(res, message, 400);
  }

  // Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    const message = err.errors ? err.errors.map(e => e.message).join(', ') : 'Validation error';
    return errorResponse(res, message, 400);
  }

  // Sequelize Foreign Key Constraint Error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return errorResponse(res, 'Foreign key constraint error. Referenced record does not exist or is in use.', 400);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, message, statusCode);
};

module.exports = {
  errorHandler
};
