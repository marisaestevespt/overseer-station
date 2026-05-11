
ALTER TABLE public.rectification_requests
ADD CONSTRAINT rectification_requests_instance_id_fkey
FOREIGN KEY (instance_id) REFERENCES public.instances(id) ON DELETE SET NULL;
