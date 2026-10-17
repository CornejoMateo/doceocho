INSERT INTO storage.buckets (id, name, public)
VALUES ('suppliers-files', 'suppliers-files', false);

CREATE POLICY "Suppliers files bucket select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'suppliers-files'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND u.role = 'Admin'
    )
);

CREATE POLICY "Suppliers files bucket insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'suppliers-files'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND u.role = 'Admin'
    )
);

CREATE POLICY "Suppliers files bucket update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'suppliers-files'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND u.role = 'Admin'
    )
);

CREATE POLICY "Suppliers files bucket delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'suppliers-files'
    AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.uid_user = auth.uid()
            AND u.role = 'Admin'
    )
);
