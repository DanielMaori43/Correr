const express = require('express');
const app = express();
const port = 3000;
const path = require('path');

// Middleware para analisar o corpo das requisições como JSON
app.use(express.json());

// Servir arquivos estáticos (HTML, CSS, JS das bibliotecas) da raiz do projeto
app.use(express.static(path.join(__dirname)));

// Rota para receber dados de localização do front-end
app.post('/api/location', (req, res) => {
    const { latitude, longitude, timestamp, distance } = req.body;
    console.log('Dados de localização recebidos:', { latitude, longitude, timestamp, distance });
    // Aqui você pode implementar a lógica para armazenar esses dados em um banco de dados,
    // processá-los ou fazer qualquer outra coisa que seu back-end precise.
    res.sendStatus(200); // Responde com sucesso
});

// Rota para servir a página inicial (seu index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Servidor Node.js rodando em http://localhost:${port}`);
});