-- The reviewer's own reading of a match.
--
-- The engine produces per-dimension fits and a classification. A reviewer can
-- approve or reject that, but until now could not disagree with it in detail —
-- there was one set of fits on the row and it was the machine's.
--
-- That matters because promotion carries the fits onto the public match page.
-- Without somewhere for a person's assessment to live, the page an industrial
-- reader sees is the model's opinion, and "AI recommends, InThinks qualifies"
-- is a slogan rather than something the data can show.
--
-- So a reviewer records their own fits alongside. The engine's stay untouched,
-- because the point of keeping both is being able to see where the two differ:
-- a mechanism the model called strong and a reviewer called moderate is the
-- most interesting row in the register.
--
-- Null means not yet reviewed. Promotion prefers the reviewed values and falls
-- back to the engine's, so a match promoted without a review is still the
-- machine's read — visibly, rather than silently.

ALTER TABLE matches ADD COLUMN review_mechanism_fit TEXT;
ALTER TABLE matches ADD COLUMN review_application_fit TEXT;
ALTER TABLE matches ADD COLUMN review_trl_fit TEXT;
ALTER TABLE matches ADD COLUMN review_constraint_fit TEXT;
ALTER TABLE matches ADD COLUMN review_classification TEXT;

-- What the reviewer concluded, in their own words. Distinct from
-- `decision_note`: that records why a decision was taken, this records what
-- the technical assessment found.
ALTER TABLE matches ADD COLUMN review_note TEXT;

ALTER TABLE matches ADD COLUMN reviewed_by TEXT;
ALTER TABLE matches ADD COLUMN reviewed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_matches_reviewed ON matches (reviewed_at);
