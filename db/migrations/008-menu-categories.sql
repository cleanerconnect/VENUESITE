-- The card becomes a list the venue writes, and its sections get names.
--
-- A basique deployment's « Menu » tab was an upload: a PDF, or up to
-- ten photographs of the pages. That is a picture of a menu, and the
-- app's Menu screen wants a menu — a list it can lay out, search and
-- price in the guest's currency. A photograph of a laminated card is
-- also the thing a venue changes last, so the prices a guest reads
-- were routinely a season old.
--
-- The dishes already had a table. What they did not have was a section
-- a partner could name: `menu_items.category` held one of five ids —
-- entrée, plat, dessert, boisson, cocktail — which is a French
-- bistro's card and nobody else's. `menu_categories` gives the names
-- to the venue and keeps the id, so the Carte screen's icons still
-- resolve for the five and a venue's own « Mezzés » simply has none.
--
-- The PDF is not withdrawn. It stays on the tab as an attachment, for
-- a venue whose card is a designed object and for the guest who would
-- rather see it.

CREATE TABLE IF NOT EXISTS menu_categories (
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  id       TEXT NOT NULL,
  name     TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (venue_id, id)
);
CREATE INDEX IF NOT EXISTS idx_menu_categories_venue
  ON menu_categories(venue_id, position);

-- One row per section a venue's dishes actually use, named with the
-- label the portal has been printing for it all along, and ordered the
-- way a card reads rather than alphabetically.
INSERT INTO menu_categories (venue_id, id, name, position)
SELECT DISTINCT
       m.venue_id,
       m.category,
       CASE m.category
         WHEN 'entree'   THEN 'Entrées'
         WHEN 'plat'     THEN 'Plats'
         WHEN 'dessert'  THEN 'Desserts'
         WHEN 'boisson'  THEN 'Boissons'
         WHEN 'cocktail' THEN 'Cocktails'
         ELSE m.category
       END,
       CASE m.category
         WHEN 'entree'   THEN 0
         WHEN 'plat'     THEN 1
         WHEN 'dessert'  THEN 2
         WHEN 'boisson'  THEN 3
         WHEN 'cocktail' THEN 4
         ELSE 5
       END
  FROM menu_items m
 WHERE m.category <> ''
   AND NOT EXISTS (
         SELECT 1 FROM menu_categories c
          WHERE c.venue_id = m.venue_id AND c.id = m.category
       );
