-- Contact messages.
--
-- Deliberately not a third intake. Challenges and innovations have structured
-- forms because an assessment needs particular facts in particular fields;
-- this is the other thing — someone who wants to ask a question, propose a
-- partnership, or find out whether they are even in the right place.
--
-- So it is narrow on purpose: who, how to reach them, what it is about, and
-- what they said. Every field is a real column because there is no long tail
-- here to grow into a payload blob, and a message you cannot filter by topic
-- is a message that sits unread.
--
-- `handled_at` and `handled_by` record that someone dealt with it, which is
-- the only workflow a message needs. Anything more and it wants to be one of
-- the two real intakes instead.

CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  reference   TEXT    NOT NULL UNIQUE,
  created_at  TEXT    NOT NULL,

  -- New on arrival; the rest are set by whoever picks it up.
  status      TEXT    NOT NULL DEFAULT 'New',

  name        TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  organisation TEXT,
  topic       TEXT    NOT NULL,
  message     TEXT    NOT NULL,

  handled_at  TEXT,
  handled_by  TEXT,
  note        TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_status  ON messages (status);
CREATE INDEX IF NOT EXISTS idx_messages_topic   ON messages (topic);
