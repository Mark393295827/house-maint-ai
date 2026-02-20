-- server/db/migrations/002_add_reviews.sql
-- Adapted to match our internal schema.ts and existing code.
-- Maps 'booking_id' -> 'report_id', 'reviewer_id' -> 'user_id', 'reviewee_id' -> 'worker_id'.

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES reports(id) UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  photos TEXT, -- JSON array of URLs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_worker_id ON reviews(worker_id);

-- Worker Average Ratings View
-- Aggregates ratings per worker for real-time analytics
DROP VIEW IF EXISTS worker_ratings;
CREATE VIEW worker_ratings AS
SELECT 
  worker_id,
  AVG(rating) as avg_rating,
  COUNT(*) as total_reviews
FROM reviews
GROUP BY worker_id;
