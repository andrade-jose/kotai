const express = require('express');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/stats', (req, res) => {
  const visits_today = db.prepare(`
    SELECT COUNT(*) as count FROM visits 
    WHERE date(visited_at) = date('now')
  `).get();

  const visits_total = db.prepare('SELECT COUNT(*) as count FROM visits').get();

  const visits_by_page = db.prepare(`
    SELECT page, COUNT(*) as count FROM visits 
    GROUP BY page ORDER BY count DESC LIMIT 10
  `).all();

  const price = db.prepare('SELECT * FROM price_cache WHERE id = 1').get();
  const news = db.prepare('SELECT generated_at FROM news_cache WHERE id = 1').get();

  res.json({
    visits_today: visits_today.count,
    visits_total: visits_total.count,
    visits_by_page,
    price_last_update: price?.updated_at,
    news_last_update: news?.generated_at,
  });
});

module.exports = router;
