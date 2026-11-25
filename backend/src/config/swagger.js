const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EDU CRM API',
      version: '1.0.0',
      description: 'Education CRM Management System RESTful API with Swagger documentation'
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Local development server (/api/v1)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [
    './src/modules/**/*.js',
    './src/routes.js',
    './modules/**/*.js',
    './routes.js'
  ]
};


const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

