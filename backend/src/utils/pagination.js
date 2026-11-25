/**
 * Pagination helper
 */

const getPagination = (page = 1, limit = 10) => {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const offset = (parsedPage - 1) * parsedLimit;

  return { limit: parsedLimit, offset, page: parsedPage };
};

const getPagingData = (data, page, limit) => {
  const { count: totalItems, rows: items } = data;
  const currentPage = page ? +page : 1;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    totalItems,
    totalPages,
    currentPage,
    items,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};

module.exports = {
  getPagination,
  getPagingData
};
