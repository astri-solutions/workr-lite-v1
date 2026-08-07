-- Splash became a scheduled "campaign" with a small history of recently
-- used ones (see SplashPage.tsx) instead of a single always-on record —
-- this column stores that history (last 5, most recent first), separate
-- from `splash` (the currently configured/live one) and `splash_templates`
-- (named, reusable presets).
alter table portal_config add column if not exists splash_history jsonb not null default '[]'::jsonb;
