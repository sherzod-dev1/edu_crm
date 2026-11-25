const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const routes = require('./routes');
const { notFound } = require('./middleware/notFoundMiddleware');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Swagger Documentation UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EDU CRM API Server is running smoothly!',
    version: '1.0.0',
    swagger_docs: 'http://localhost:5000/api/docs'
  });
});

// API Routes
app.use('/api/v1', routes);

// 404 Handler
app.use(notFound);

// Error Handler
app.use(errorHandler);

module.exports = app;
