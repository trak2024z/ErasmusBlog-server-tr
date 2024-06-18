const jwt = require('jsonwebtoken');
const HttpError = require('../models/errorModel');

const authMiddleware = (req, res, next) => {
    // Получаем заголовок Authorization из запроса, учитывая различные варианты написания заголовка
    const authorizationHeader = req.headers.authorization || req.headers.Authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
        return next(new HttpError("No token provided.", 401));
    }

    // Извлекаем токен из заголовка Authorization
    const token = authorizationHeader.split(' ')[1];

    // Проверяем токен на валидность
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
        if (err) {
            return next(new HttpError("Invalid token.", 403));
        }

        // Если токен валиден, добавляем информацию о пользователе в объект запроса для последующего использования
        req.user = decodedToken;
        next();
    });
};

module.exports = authMiddleware;
