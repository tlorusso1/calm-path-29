-- Remover policies restritivas e recriar como permissivas
DROP POLICY IF EXISTS "Users can insert their own focus mode state" ON public.focus_mode_states;
DROP POLICY IF EXISTS "Users can update their own focus mode state" ON public.focus_mode_states;
DROP POLICY IF EXISTS "Users can view their own focus mode state" ON public.focus_mode_states;
DROP POLICY IF EXISTS "Users can delete their own focus mode state" ON public.focus_mode_states;

-- Recriar policies como PERMISSIVE (default)
CREATE POLICY "Users can view their own focus mode state"
ON public.focus_mode_states
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own focus mode state"
ON public.focus_mode_states
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus mode state"
ON public.focus_mode_states
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus mode state"
ON public.focus_mode_states
FOR DELETE
USING (auth.uid() = user_id);