// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

// Configurações comuns
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Importe os routers
const authRouter = require('./index');
const productRouter = require('./app'); // Agora é um router

// Monte os routers - note que o prefixo /api já está no server.js
app.use('/auth', authRouter);
app.use('/api', productRouter); // Todas as rotas de productRouter terão prefixo /api

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/icons', express.static(path.join(__dirname, 'icons')));

// Rota de teste
app.get('/', (req, res) => {
  res.send('API StrayWollf está funcionando!');
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Algo quebrou!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} 🚀`);
});

module.exports = app;