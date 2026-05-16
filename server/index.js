require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const path = require('path');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3002;

app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Log de visitas
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/auth')) {
    try {
      db.prepare('INSERT INTO visits (page, ip) VALUES (?, ?)').run(
        req.path,
        req.ip
      );
    } catch {}
  }
  next();
});

// Rotas API
app.use('/api/price', require('./routes/price'));
app.use('/api/news', require('./routes/news'));
app.use('/api/admin', require('./routes/admin'));
app.use('/auth', require('./routes/auth'));

// Protege /admin — redireciona se não tiver cookie
app.use('/admin', (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.redirect('/login.html');
  try {
    require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie('token');
    res.redirect('/login.html');
  }
});

// Arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Fallback 404
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, '../public/404.html')));

app.listen(PORT, () => {
  console.log(`✓ Kotai Tracker rodando na porta ${PORT}`);
  console.log(`✓ Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
