INSERT INTO storage.buckets (id, name, public)
VALUES ('modules', 'modules', false);

CREATE POLICY "Modules bucket select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'modules'
    AND (
        EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.uid_user = auth.uid()
              AND u.role = 'Admin'
        )
        OR EXISTS (
            SELECT 1
            FROM public.modules_files mf
            JOIN public.modules m
              ON m.id = mf.module_id
            WHERE mf.storage_path = storage.objects.name
              AND m.user_id = auth.uid()
        )
    )
);

CREATE POLICY "Modules bucket insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'modules'
    AND (
        EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.uid_user = auth.uid()
              AND u.role = 'Admin'
        )
        OR EXISTS (
            SELECT 1
            FROM public.modules_files mf
            JOIN public.modules m
              ON m.id = mf.module_id
            WHERE mf.storage_path = storage.objects.name
              AND m.user_id = auth.uid()
        )
    )
);

CREATE POLICY "Modules bucket update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'modules'
    AND (
        EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.uid_user = auth.uid()
              AND u.role = 'Admin'
        )
        OR EXISTS (
            SELECT 1
            FROM public.modules_files mf
            JOIN public.modules m
              ON m.id = mf.module_id
            WHERE mf.storage_path = storage.objects.name
              AND m.user_id = auth.uid()
        )
    )
);

CREATE POLICY "Modules bucket delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'modules'
    AND (
        EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.uid_user = auth.uid()
              AND u.role = 'Admin'
        )
        OR EXISTS (
            SELECT 1
            FROM public.modules_files mf
            JOIN public.modules m
              ON m.id = mf.module_id
            WHERE mf.storage_path = storage.objects.name
              AND m.user_id = auth.uid()
        )
    )
);

-- Para que nos deje insertar un archivo en el bucket primero tenemos que generar el storage_path y 
-- luego insertar el registro en la tabla modules_files, de esta manera podemos controlar 
-- que el usuario que sube el archivo sea el mismo que creó el módulo.

-- Cuando se quiera eliminar un archivo, primero se debe eliminar el archivo en el bucket,
-- si no hay errores recien ahi debemos eliminar el registro en la tabla modules_files,
-- lo que sirve para no dejar archivos huérfanos en el bucket
-- En el caso que luego de eliminar el archivo en el bucket haya un error al eliminar el registro en la tabla modules_files, 
-- se deberia hacer un rollback insertando nuevamente el archivo en el bucket, para no dejar archivos huérfanos.
