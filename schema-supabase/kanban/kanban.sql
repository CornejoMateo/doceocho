CREATE POLICY "Public select kanban_boards"
ON public.kanban_boards
FOR SELECT
TO authenticated
USING (true)

CREATE POLICY "Public insert kanban_boards"
ON public.kanban_boards
FOR INSERT
TO authenticated
WITH CHECK ADMIN

CREATE POLICY "Public delete kanban_boards"
ON public.kanban_boards
FOR DELETE
TO authenticated
USING ADMIN;

CREATE POLICY "Public update kanban_boards"
ON public.kanban_boards
FOR UPDATE
TO authenticated
USING ADMIN;

---------------------

CREATE POLICY "Public select kanban_boards_members"
ON public.kanban_boards_members
FOR SELECT
TO authenticated
USING (uid_user == auth.id) -- Cada usuario puede ver su propia fila para ver que tableros mostrar

CREATE POLICY "Public insert kanban_boards_members"
ON public.kanban_boards_membersx
FOR INSERT
TO authenticated
WITH CHECK ADMIN

CREATE POLICY "Public delete kanban_boards_members"
ON public.kanban_boards_members
FOR DELETE
TO authenticated
USING ADMIN;

CREATE POLICY "Public update kanban_boards_members"
ON public.kanban_boards_members
FOR UPDATE
TO authenticated
USING ADMIN;

--------------

CREATE POLICY "Public select kanban_boards"
ON public.kanban_boards
FOR SELECT
TO authenticated
USING (true)

CREATE POLICY "Public insert kanban_boards"
ON public.kanban_boards
FOR INSERT
TO authenticated
WITH CHECK ADMIN

CREATE POLICY "Public delete kanban_boards"
ON public.kanban_boards
FOR DELETE
TO authenticated
USING ADMIN;

CREATE POLICY "Public update kanban_boards"
ON public.kanban_boards
FOR UPDATE
TO authenticated
USING ADMIN;
