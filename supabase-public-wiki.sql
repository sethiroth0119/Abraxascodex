-- Public wiki access
-- ----------------------------------------------------------------------------
-- The studio's collections live in one table, studio_collections, whose read
-- policy is "authenticated only". Opening that to anon would expose every
-- collection -- private articles, bug reports, tasks, the lot.
--
-- Instead this exposes a single view holding only what a public reader is
-- allowed to see: articles explicitly marked visibility='public', with their
-- secrets filtered down to the ones marked as revealed to players.
--
-- The view is owned by the migration role and left with security_invoker off,
-- so it reads studio_collections past RLS on purpose; the filtering below is
-- what keeps it safe. Nothing here grants access to the underlying table.

drop view if exists public.public_wiki_articles;

create view public.public_wiki_articles as
select
  a->>'id'                                   as id,
  a->>'title'                                as title,
  a->>'excerpt'                              as excerpt,
  a->>'template'                             as template,
  nullif(a->>'category', '')                 as category,
  coalesce(a->'tags',  '[]'::jsonb)          as tags,
  coalesce(a->'body',  '{}'::jsonb)          as body,
  coalesce(a->'links', '[]'::jsonb)          as links,
  a->'cover'                                 as cover,
  -- only secrets explicitly revealed to players travel outside the studio
  (
    select coalesce(jsonb_agg(s), '[]'::jsonb)
    from jsonb_array_elements(coalesce(a->'secrets', '[]'::jsonb)) s
    where s->>'level' = 'player'
  )                                          as secrets
from public.studio_collections c
cross join lateral jsonb_array_elements(c.data) a
where c.key = 'articles'
  and jsonb_typeof(c.data) = 'array'
  and coalesce(a->>'_deleted', 'false') <> 'true'
  and a->>'visibility' = 'public';

-- Readable by anyone, signed in or not. No insert/update/delete: it is a view
-- over a table neither role can reach directly.
grant select on public.public_wiki_articles to anon, authenticated;
