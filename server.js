const express = require('express');
const path = require('path');
const app = express();

// Railway назначает порт через PORT, если нет — используем 3000
const port = process.env.PORT || 3000;

// Это критически важно: указываем путь к файлам
app.use(express.static(path.join(__dirname, '.')));

// Запуск сервера на '0.0.0.0' — это ключ к тому, чтобы он видел запросы извне
app.listen(port, '0.0.0.0', () => {
    console.log(`Сервер запущен и слушает порт ${port}`);
});