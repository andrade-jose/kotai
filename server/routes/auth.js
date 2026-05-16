const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const router = express.Router();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, (accessToken, refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value;
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim());
  if (!allowed.includes(email)) {
    return done(null, false, { message: 'não autorizado' });
  }
  const existing = db.prepare('SELECT * FROM admins WHERE google_id = ?').get(profile.id);
  if (existing) return done(null, existing);
  const insert = db.prepare(
    'INSERT INTO admins (google_id, email, name, avatar) VALUES (?, ?, ?, ?)'
  );
  insert.run(profile.id, email, profile.displayName, profile.photos?.[0]?.value);
  return done(null, db.prepare('SELECT * FROM admins WHERE google_id = ?').get(profile.id));
}));

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login.html?erro=nao_autorizado' }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, name: req.user.name, avatar: req.user.avatar },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect('/admin/');
  }
);

router.get('/me', require('../middleware/auth'), (req, res) => {
  res.json(req.user);
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

module.exports = router;