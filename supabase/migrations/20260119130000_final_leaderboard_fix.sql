WHERE id IN (SELECT user_id FROM public.challenges OFFSET 2 LIMIT 1);
