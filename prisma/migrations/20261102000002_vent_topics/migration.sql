WITH mapping(old_topic, new_topic) AS (VALUES
  ('Toxic Culture', 'Leadership'),
  ('Culture', 'Leadership'),
  ('Colleague Drama', 'Coworkers'),
  ('Office Romance', 'Coworkers'),
  ('Salary Secrets', 'Pay'),
  ('The Burnout Zone', 'Workload'),
  ('HR Tales', 'HR'),
  ('WFH Reality', 'Remote'),
  ('Layoff Stories', 'Layoffs'),
  ('Whistleblower', 'Ethics')
)
UPDATE "Vent" AS vent SET category = mapping.new_topic
FROM mapping WHERE vent.category = mapping.old_topic;

WITH mapping(old_topic, new_topic) AS (VALUES
  ('Toxic Culture', 'Leadership'),
  ('Culture', 'Leadership'),
  ('Colleague Drama', 'Coworkers'),
  ('Office Romance', 'Coworkers'),
  ('Salary Secrets', 'Pay'),
  ('The Burnout Zone', 'Workload'),
  ('HR Tales', 'HR'),
  ('WFH Reality', 'Remote'),
  ('Layoff Stories', 'Layoffs'),
  ('Whistleblower', 'Ethics')
)
INSERT INTO "TopicFollow" ("userId", "topic", "createdAt")
SELECT follows."userId", mapping.new_topic, MIN(follows."createdAt")
FROM "TopicFollow" AS follows JOIN mapping ON follows.topic = mapping.old_topic
GROUP BY follows."userId", mapping.new_topic
ON CONFLICT ("userId", "topic") DO NOTHING;

DELETE FROM "TopicFollow" WHERE topic IN (
  'Toxic Culture', 'Culture', 'Colleague Drama', 'Office Romance', 'Salary Secrets',
  'The Burnout Zone', 'HR Tales', 'WFH Reality', 'Layoff Stories', 'Whistleblower'
);
