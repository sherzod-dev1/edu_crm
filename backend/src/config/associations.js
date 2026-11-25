const db = require('../models');

/**
 * Model associations are centrally initialized in ../models/index.js
 * via each model's .associate(models) method.
 */
const setupAssociations = (models = db) => {
  return models;
};

module.exports = {
  setupAssociations
};




