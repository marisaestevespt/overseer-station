
-- 1. Remover policies duplicadas/permissivas do bucket email-assets
DROP POLICY IF EXISTS "Authenticated users can upload email assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update email assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete email assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view email assets" ON storage.objects;

-- 2. Ligar os triggers órfãos para atribuir roles a partir de pending_user_invites
DROP TRIGGER IF EXISTS on_auth_user_created_assign_pending ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_pending
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_pending_role_on_create();

DROP TRIGGER IF EXISTS on_auth_user_confirmed_assign_pending ON auth.users;
CREATE TRIGGER on_auth_user_confirmed_assign_pending
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_pending_role_on_confirm();

-- 3. Garantir que o trigger do bootstrap super admin também está ativo
DROP TRIGGER IF EXISTS on_auth_user_created_assign_super_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_super_admin
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_super_admin_on_signup();
