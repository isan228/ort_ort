export function errorHandler(err, _req, res, _next) {
  console.error(err);

  const status = err.status || 500;
  const message = err.message || 'Внутренняя ошибка сервера';

  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message,
    },
  });
}

export function notFoundHandler(_req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Маршрут не найден',
    },
  });
}
