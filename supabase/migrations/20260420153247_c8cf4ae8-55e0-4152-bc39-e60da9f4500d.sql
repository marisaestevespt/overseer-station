-- 1. Adicionar valor 'support' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
