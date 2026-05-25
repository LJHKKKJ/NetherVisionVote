const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('.')); // Это заставит сервер отдавать твой index.html
app.listen(port, '0.0.0.0', () => console.log(`Server running on port ${port}`));