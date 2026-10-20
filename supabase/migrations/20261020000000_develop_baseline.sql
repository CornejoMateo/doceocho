


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."arca_environment" AS ENUM (
    'homologation',
    'production'
);


ALTER TYPE "public"."arca_environment" OWNER TO "postgres";


CREATE TYPE "public"."audit_action" AS ENUM (
    'create',
    'update',
    'delete',
    'authenticate',
    'authorize',
    'reject',
    'error'
);


ALTER TYPE "public"."audit_action" OWNER TO "postgres";


CREATE TYPE "public"."company_status" AS ENUM (
    'active',
    'inactive',
    'suspended'
);


ALTER TYPE "public"."company_status" OWNER TO "postgres";


CREATE TYPE "public"."currency_code" AS ENUM (
    'pes',
    'dol',
    'eur',
    'brl'
);


ALTER TYPE "public"."currency_code" OWNER TO "postgres";


CREATE TYPE "public"."invoice_status" AS ENUM (
    'draft',
    'pending',
    'authorized',
    'rejected',
    'cancelled'
);


ALTER TYPE "public"."invoice_status" OWNER TO "postgres";


CREATE TYPE "public"."iva_condition" AS ENUM (
    'responsable_inscripto',
    'responsable_no_inscripto',
    'exento',
    'monotributo',
    'consumidor_final'
);


ALTER TYPE "public"."iva_condition" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'cash',
    'bank_transfer',
    'check',
    'credit_card',
    'debit_card'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view"("view_key" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.users u
    where u.uid_user = auth.uid()
      and u.views ? view_key
      and u.views ? split_part(view_key, '.', 1)
  );
$$;


ALTER FUNCTION "public"."can_view"("view_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cash_flow_fixed_costs_monthly"("p_year" integer) RETURNS TABLE("month" integer, "net" numeric, "iva" numeric, "total" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT extract(month from paid_date)::int AS month,
         SUM(net_amount) AS net,
         SUM(iva_amount) AS iva,
         SUM(total_amount) AS total
  FROM public.fixed_expense_payments
  WHERE extract(year from paid_date)::int = p_year
  GROUP BY extract(month from paid_date)::int;
$$;


ALTER FUNCTION "public"."cash_flow_fixed_costs_monthly"("p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cash_flow_movement_totals"("p_group_by" "text", "p_start" "date" DEFAULT NULL::"date", "p_end" "date" DEFAULT NULL::"date") RETURNS TABLE("group_id" bigint, "total_in" numeric, "total_out" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  WITH movements AS (
    -- Collections: amount/date always set (not null columns)
    SELECT date AS mv_date, 'in'::text AS direction, COALESCE(amount, 0) AS amount,
           bank_account_id, payment_method_id
    FROM public.collections
    UNION ALL
    -- balance_transactions: date/amount nullable on legacy rows; null date falls back to
    -- the Argentina-zoned day of created_at so old rows aren't dropped from period scoping
    SELECT COALESCE(date, (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date),
           'in', COALESCE(amount, 0), bank_account_id, payment_method_id
    FROM public.balance_transactions
    UNION ALL
    SELECT date, 'out', amount, bank_account_id, payment_method_id
    FROM public.payments
    UNION ALL
    SELECT paid_date, 'out', amount_ars, bank_account_id, payment_method_id
    FROM public.payments_suppliers
    UNION ALL
    SELECT paid_date, 'out', total_amount, bank_account_id, payment_method_id
    FROM public.fixed_expense_payments
    -- transactions_box (the cash-box ledger) is deliberately excluded: it is scheduled for
    -- removal and its rows are a trigger-generated mirror of balance_transactions, so
    -- including it would double-count every client collection.
  )
  SELECT
    CASE WHEN p_group_by = 'bank_account' THEN bank_account_id ELSE payment_method_id END AS group_id,
    COALESCE(SUM(amount) FILTER (WHERE direction = 'in'), 0) AS total_in,
    COALESCE(SUM(amount) FILTER (WHERE direction = 'out'), 0) AS total_out
  FROM movements
  WHERE (p_start IS NULL OR mv_date >= p_start)
    AND (p_end IS NULL OR mv_date <= p_end)
  GROUP BY CASE WHEN p_group_by = 'bank_account' THEN bank_account_id ELSE payment_method_id END;
$$;


ALTER FUNCTION "public"."cash_flow_movement_totals"("p_group_by" "text", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cash_flow_summary_monthly"("p_year" integer) RETURNS TABLE("month" integer, "work_id" bigint, "income_net" numeric, "income_iva" numeric, "expense_net" numeric, "expense_iva" numeric, "collection_amount" numeric, "payment_amount" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  WITH movements AS (
    SELECT extract(month from date)::int AS mv_month, work_id,
           net_amount AS income_net, iva_amount AS income_iva,
           0::numeric AS expense_net, 0::numeric AS expense_iva,
           0::numeric AS collection_amount, 0::numeric AS payment_amount
    FROM public.incomes
    WHERE extract(year from date)::int = p_year
    UNION ALL
    SELECT extract(month from date)::int, work_id,
           0, 0, net_amount, iva_amount, 0, 0
    FROM public.expenses
    WHERE extract(year from date)::int = p_year
    UNION ALL
    SELECT extract(month from date)::int, work_id,
           0, 0, 0, 0, COALESCE(amount, 0), 0
    FROM public.collections
    WHERE extract(year from date)::int = p_year
    UNION ALL
    -- balance_transactions: date/amount nullable on legacy rows; null date falls back to the
    -- Argentina-zoned day of created_at so old rows aren't dropped from year scoping.
    SELECT extract(month from COALESCE(date, (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date))::int,
           work_id, 0, 0, 0, 0, COALESCE(amount, 0), 0
    FROM public.balance_transactions
    WHERE extract(year from COALESCE(date, (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date))::int = p_year
    UNION ALL
    SELECT extract(month from date)::int, work_id, 0, 0, 0, 0, 0, amount
    FROM public.payments
    WHERE extract(year from date)::int = p_year
    UNION ALL
    SELECT extract(month from paid_date)::int, work_id, 0, 0, 0, 0, 0, amount_ars
    FROM public.payments_suppliers
    WHERE extract(year from paid_date)::int = p_year
  )
  SELECT mv_month AS month, work_id,
         SUM(income_net) AS income_net,
         SUM(income_iva) AS income_iva,
         SUM(expense_net) AS expense_net,
         SUM(expense_iva) AS expense_iva,
         SUM(collection_amount) AS collection_amount,
         SUM(payment_amount) AS payment_amount
  FROM movements
  GROUP BY mv_month, work_id;
$$;


ALTER FUNCTION "public"."cash_flow_summary_monthly"("p_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_expired_tokens"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM arca_tokens
  WHERE expiration_time < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."clean_expired_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_open_cash_box"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.cash_boxes cb
  set
    is_closed = true,
    closed_at = now(),
    closing_balance =
      coalesce(cb.opening_balance, 0) +
      coalesce((
        select sum(
          case
            when t.type = 'income' then t.amount
            when t.type = 'expense' then -t.amount
            else 0
          end
        )
        from public.transactions_box t
        where t.cash_box_id = cb.id
      ), 0)
  where cb.is_closed = false;
end;
$$;


ALTER FUNCTION "public"."close_open_cash_box"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."close_pending_attendance_entries"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    argentina_date date;
    argentina_close_time timestamptz;
BEGIN
    argentina_date :=
        (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;

    argentina_close_time :=
        argentina_date::timestamp
        AT TIME ZONE 'America/Argentina/Buenos_Aires';

    argentina_close_time :=
        argentina_close_time + interval '23 hours';

    INSERT INTO public.attendance_entries (
        attendance_id,
        type,
        entry_time,
        description
    )
    SELECT
        latest.attendance_id,
        CASE
            WHEN latest.type = 'regular_in' THEN 'regular_out'
            WHEN latest.type = 'overtime_in' THEN 'overtime_out'
        END,
        argentina_close_time,
        'Salida automática por cierre de jornada'
    FROM (
        SELECT DISTINCT ON (ae.attendance_id)
            ae.attendance_id,
            ae.type,
            ae.entry_time,
            ae.id
        FROM public.attendance_entries ae
        INNER JOIN public.attendance a
            ON a.id = ae.attendance_id
        WHERE a.date = argentina_date
        ORDER BY ae.attendance_id, ae.entry_time DESC, ae.id DESC
    ) latest
    WHERE latest.type IN ('regular_in', 'overtime_in')
      AND NOT EXISTS (
          SELECT 1
          FROM public.attendance_entries existing
          WHERE existing.attendance_id = latest.attendance_id
            AND existing.type = CASE
                WHEN latest.type = 'regular_in' THEN 'regular_out'
                WHEN latest.type = 'overtime_in' THEN 'overtime_out'
            END
            AND existing.entry_time >= argentina_close_time
      );
END;
$$;


ALTER FUNCTION "public"."close_pending_attendance_entries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO arca_audit_logs (
      tenant_id,
      company_id,
      user_id,
      action,
      entity_type,
      entity_id,
      new_values,
      correlation_id
    ) VALUES (
      NEW.tenant_id,
      NEW.company_id,
      auth.uid(),
      'create',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW),
      gen_random_uuid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO arca_audit_logs (
      tenant_id,
      company_id,
      user_id,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values,
      correlation_id
    ) VALUES (
      NEW.tenant_id,
      NEW.company_id,
      auth.uid(),
      'update',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      gen_random_uuid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO arca_audit_logs (
      tenant_id,
      company_id,
      user_id,
      action,
      entity_type,
      entity_id,
      old_values,
      correlation_id
    ) VALUES (
      OLD.tenant_id,
      OLD.company_id,
      auth.uid(),
      'delete',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      gen_random_uuid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."create_audit_log"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_board_with_member"("p_name" "text", "p_description" "text", "p_color" character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_board_id bigint;
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid_user = v_user_id
      AND public.is_admin_role(role)
  )
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'No tenés permisos para crear tableros';
  END IF;

  INSERT INTO public.kanban_boards (name, description, color)
  VALUES (p_name, p_description, p_color)
  RETURNING id INTO v_board_id;

  INSERT INTO public.kanban_board_members (board_id, user_id)
  VALUES (v_board_id, v_user_id);

  RETURN jsonb_build_object(
    'id', v_board_id,
    'name', p_name,
    'description', p_description,
    'color', p_color
  );
END;
$$;


ALTER FUNCTION "public"."create_board_with_member"("p_name" "text", "p_description" "text", "p_color" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_fixed_expense_payment"("p_payment_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_fixed_expense_id bigint;
  v_current_month date := date_trunc('month', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date;
BEGIN
  DELETE FROM public.fixed_expense_payments fep
  WHERE fep.id = p_payment_id
  RETURNING fep.fixed_expense_id INTO v_fixed_expense_id;

  IF v_fixed_expense_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo eliminar el pago (no existe o no tenés permisos)';
  END IF;

  UPDATE public.fixed_expenses fe
  SET is_paid = EXISTS (
    SELECT 1 FROM public.fixed_expense_payments fep2
    WHERE fep2.fixed_expense_id = fe.id
      AND fep2.period = v_current_month
  )
  WHERE fe.id = v_fixed_expense_id;
END;
$$;


ALTER FUNCTION "public"."delete_fixed_expense_payment"("p_payment_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_payment_supplier"("p_id" bigint) RETURNS "text"[]
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_file_paths text[];
  v_deleted_id bigint;
BEGIN
  WITH deleted AS (
    DELETE FROM public.files_payments_suppliers
    WHERE payment_supplier_id = p_id
    RETURNING storage_path
  )
  SELECT array_agg(storage_path) INTO v_file_paths FROM deleted;

  DELETE FROM public.payments_suppliers
  WHERE id = p_id
  RETURNING id INTO v_deleted_id;

  IF v_deleted_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo eliminar el pago (no existe o no tenés permisos)';
  END IF;

  RETURN COALESCE(v_file_paths, ARRAY[]::text[]);
END;
$$;


ALTER FUNCTION "public"."delete_payment_supplier"("p_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_purchase_supplier"("p_id" bigint) RETURNS "text"[]
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_payment_file_paths text[];
  v_purchase_file_paths text[];
  v_deleted_id bigint;
BEGIN

  PERFORM 1 FROM public.purchases_suppliers WHERE id = p_id FOR UPDATE;
  PERFORM 1 FROM public.payments_suppliers WHERE purchase_supplier_id = p_id FOR UPDATE;

  WITH deleted AS (
    DELETE FROM public.files_payments_suppliers f
    USING public.payments_suppliers p
    WHERE f.payment_supplier_id = p.id
      AND p.purchase_supplier_id = p_id
    RETURNING f.storage_path
  )
  SELECT array_agg(storage_path) INTO v_payment_file_paths FROM deleted;

  DELETE FROM public.payments_suppliers
  WHERE purchase_supplier_id = p_id;

  WITH deleted AS (
    DELETE FROM public.files_purchases_suppliers
    WHERE purchase_supplier_id = p_id
    RETURNING storage_path
  )
  SELECT array_agg(storage_path) INTO v_purchase_file_paths FROM deleted;

  DELETE FROM public.purchases_suppliers
  WHERE id = p_id
  RETURNING id INTO v_deleted_id;

  IF v_deleted_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo eliminar la compra (no existe o no tenés permisos)';
  END IF;

  RETURN COALESCE(v_purchase_file_paths, ARRAY[]::text[])
    || COALESCE(v_payment_file_paths, ARRAY[]::text[]);
END;
$$;


ALTER FUNCTION "public"."delete_purchase_supplier"("p_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expenses_compute_iva_and_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.iva_amount := round(new.net_amount * new.iva_percent / 100, 2);
    new.total_amount := new.net_amount + new.iva_amount;
    return new;
end;
$$;


ALTER FUNCTION "public"."expenses_compute_iva_and_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_invoice_number"("p_company_id" "uuid", "p_point_of_sale" integer, "p_invoice_type" integer) RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_last_number BIGINT;
  v_next_number BIGINT;
BEGIN
  -- Get the last invoice number for this company, point of sale, and invoice type
  SELECT COALESCE(MAX(invoice_number), 0)
  INTO v_last_number
  FROM arca_invoices
  WHERE company_id = p_company_id
    AND point_of_sale = p_point_of_sale
    AND invoice_type = p_invoice_type
    AND deleted_at IS NULL;
  
  -- Increment by 1
  v_next_number := v_last_number + 1;
  
  RETURN v_next_number;
END;
$$;


ALTER FUNCTION "public"."get_next_invoice_number"("p_company_id" "uuid", "p_point_of_sale" integer, "p_invoice_type" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_supplier_account_totals"("p_supplier_id" bigint) RETURNS TABLE("total_purchases_ars" numeric, "total_payments_ars" numeric, "balance_ars" numeric, "pending_count" bigint, "paid_count" bigint)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH payments_agg AS (
    SELECT
      ps.purchase_supplier_id,
      SUM(ps.amount_ars) AS total_paid_ars
    FROM public.payments_suppliers ps
    WHERE ps.purchase_supplier_id IN (
      -- aliased for consistency: keeps every column reference unambiguous
      SELECT pp.id FROM public.purchases_suppliers pp WHERE pp.supplier_id = p_supplier_id
    )
    GROUP BY ps.purchase_supplier_id
  ),
  purchases_with_balance AS (
    SELECT
      p.amount_ars,
      p.amount_ars - COALESCE(pa.total_paid_ars, 0) AS balance_ars
    FROM public.purchases_suppliers p
    LEFT JOIN payments_agg pa ON pa.purchase_supplier_id = p.id
    WHERE p.supplier_id = p_supplier_id
  )
  SELECT
    COALESCE(SUM(pwb.amount_ars), 0) AS total_purchases_ars,
    COALESCE(SUM(pwb.amount_ars - pwb.balance_ars), 0) AS total_payments_ars,
    COALESCE(SUM(pwb.balance_ars), 0) AS balance_ars,
    COUNT(*) FILTER (WHERE pwb.balance_ars > 0) AS pending_count,
    COUNT(*) FILTER (WHERE pwb.balance_ars <= 0) AS paid_count
  FROM purchases_with_balance pwb;
END;
$$;


ALTER FUNCTION "public"."get_supplier_account_totals"("p_supplier_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_suppliers_accounts_summary"() RETURNS TABLE("supplier_id" bigint, "supplier_name" "text", "total_purchases_ars" numeric, "total_payments_ars" numeric, "balance_ars" numeric)
    LANGUAGE "sql" STABLE
    AS $$
    WITH purchases AS (
        SELECT
            supplier_id,
            SUM(amount_ars) AS total_purchases_ars
        FROM public.purchases_suppliers
        GROUP BY supplier_id
    ),
    payments AS (
        SELECT
            p.supplier_id,
            SUM(ps.amount_ars) AS total_payments_ars
        FROM public.payments_suppliers ps
        INNER JOIN public.purchases_suppliers p
            ON p.id = ps.purchase_supplier_id
        GROUP BY p.supplier_id
    )
    SELECT
        s.id AS supplier_id,
        s.name AS supplier_name,
        COALESCE(p.total_purchases_ars, 0) AS total_purchases_ars,
        COALESCE(pay.total_payments_ars, 0) AS total_payments_ars,
        COALESCE(p.total_purchases_ars, 0)
            - COALESCE(pay.total_payments_ars, 0) AS balance_ars
    FROM public.suppliers s
    LEFT JOIN purchases p
        ON p.supplier_id = s.id
    LEFT JOIN payments pay
        ON pay.supplier_id = s.id
    ORDER BY s.name;
$$;


ALTER FUNCTION "public"."get_suppliers_accounts_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_counts_by_channel"("p_user_id" "uuid") RETURNS TABLE("channel_id" bigint, "unread_count" bigint)
    LANGUAGE "sql"
    AS $$
    select
        cm.channel_id,
        count(m.id) as unread_count
    from channel_members cm
    left join messages m
      on m.channel_id = cm.channel_id
     and m.id > coalesce(cm.last_read_message_id, 0)
     and m.user_id <> p_user_id
     and m.deleted_at is null
    where cm.user_id = p_user_id
    group by cm.channel_id;
$$;


ALTER FUNCTION "public"."get_unread_counts_by_channel"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_messages_count"("p_user_id" "uuid") RETURNS bigint
    LANGUAGE "sql"
    AS $$
    select coalesce(sum(unread_count), 0)
    from get_unread_counts_by_channel(p_user_id);
$$;


ALTER FUNCTION "public"."get_unread_messages_count"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."incomes_compute_iva_and_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.iva_amount := round(new.net_amount * new.iva_percent / 100, 2);
    new.total_amount := new.net_amount + new.iva_amount;
    return new;
end;
$$;


ALTER FUNCTION "public"."incomes_compute_iva_and_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_role"("role_value" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT role_value IN ('Admin', 'Superadmin');
$$;


ALTER FUNCTION "public"."is_admin_role"("role_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_channel_member"("channel_id" bigint, "user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $_$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE channel_members.channel_id = $1
    AND channel_members.user_id = $2
  );
$_$;


ALTER FUNCTION "public"."is_channel_member"("channel_id" bigint, "user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_superadmin_role"("role_value" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT role_value = 'Superadmin';
$$;


ALTER FUNCTION "public"."is_superadmin_role"("role_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_supplier_purchases"("p_supplier_id" bigint, "p_status" "text", "p_from" "date" DEFAULT NULL::"date", "p_to" "date" DEFAULT NULL::"date", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" bigint, "created_at" timestamp with time zone, "amount_ars" numeric, "supplier_id" bigint, "notes" "text", "total_paid_ars" numeric, "balance_ars" numeric, "total_count" bigint)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_offset int := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF p_status NOT IN ('pending', 'paid') THEN
    RAISE EXCEPTION 'Estado inválido: % (debe ser pending o paid)', p_status;
  END IF;

  RETURN QUERY
  WITH payments_agg AS (
    SELECT
      ps.purchase_supplier_id,
      SUM(ps.amount_ars) AS total_paid_ars
    FROM public.payments_suppliers ps
    WHERE ps.purchase_supplier_id IN (
      -- aliased: unqualified cols would clash with the OUT params id/supplier_id
      SELECT pp.id FROM public.purchases_suppliers pp WHERE pp.supplier_id = p_supplier_id
    )
    GROUP BY ps.purchase_supplier_id
  ),
  filtered AS (
    SELECT
      p.id,
      p.created_at,
      p.amount_ars,
      p.supplier_id,
      p.notes,
      COALESCE(pa.total_paid_ars, 0) AS total_paid_ars,
      p.amount_ars - COALESCE(pa.total_paid_ars, 0) AS balance_ars
    FROM public.purchases_suppliers p
    LEFT JOIN payments_agg pa ON pa.purchase_supplier_id = p.id
    WHERE p.supplier_id = p_supplier_id
      AND (p_from IS NULL OR (p.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date >= p_from)
      AND (p_to IS NULL OR (p.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date <= p_to)
      AND (
        (p_status = 'pending' AND p.amount_ars - COALESCE(pa.total_paid_ars, 0) > 0)
        OR (p_status = 'paid' AND p.amount_ars - COALESCE(pa.total_paid_ars, 0) <= 0)
      )
  )
  SELECT
    f.id,
    f.created_at,
    f.amount_ars,
    f.supplier_id,
    f.notes,
    f.total_paid_ars,
    f.balance_ars,
    COUNT(*) OVER() AS total_count
  FROM filtered f
  ORDER BY f.created_at DESC, f.id DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;


ALTER FUNCTION "public"."list_supplier_purchases"("p_supplier_id" bigint, "p_status" "text", "p_from" "date", "p_to" "date", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."fixed_expense_payments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "fixed_expense_id" bigint NOT NULL,
    "paid_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "period" "date" NOT NULL,
    "net_amount" numeric NOT NULL,
    "iva_percent" numeric DEFAULT 0 NOT NULL,
    "iva_amount" numeric NOT NULL,
    "total_amount" numeric NOT NULL,
    "payment_method_id" bigint NOT NULL,
    "bank_account_id" bigint,
    CONSTRAINT "fixed_expense_payments_iva_amount_check" CHECK (("iva_amount" >= (0)::numeric)),
    CONSTRAINT "fixed_expense_payments_iva_percent_check" CHECK (("iva_percent" = ANY (ARRAY[(0)::numeric, 10.5, (21)::numeric, (27)::numeric]))),
    CONSTRAINT "fixed_expense_payments_net_amount_check" CHECK (("net_amount" >= (0)::numeric)),
    CONSTRAINT "fixed_expense_payments_period_first_day_check" CHECK ((EXTRACT(day FROM "period") = (1)::numeric)),
    CONSTRAINT "fixed_expense_payments_total_amount_check" CHECK (("total_amount" >= (0)::numeric)),
    CONSTRAINT "fixed_expense_payments_total_amount_sum_check" CHECK (("total_amount" = ("net_amount" + "iva_amount")))
);


ALTER TABLE "public"."fixed_expense_payments" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_fixed_expense_paid"("p_fixed_expense_id" bigint, "p_paid_date" "date", "p_period" "date", "p_net_amount" numeric, "p_iva_percent" numeric, "p_payment_method_id" bigint, "p_bank_account_id" bigint DEFAULT NULL::bigint) RETURNS SETOF "public"."fixed_expense_payments"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_iva_amount numeric;
  v_total_amount numeric;
  v_current_month date := date_trunc('month', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date;
BEGIN
  IF extract(day from p_period) <> 1 THEN
    RAISE EXCEPTION 'El período debe ser el primer día del mes';
  END IF;

  v_iva_amount := round(p_net_amount * p_iva_percent / 100, 2);
  v_total_amount := p_net_amount + v_iva_amount;

  RETURN QUERY
  INSERT INTO public.fixed_expense_payments (
    fixed_expense_id,
    paid_date,
    period,
    net_amount,
    iva_percent,
    iva_amount,
    total_amount,
    payment_method_id,
    bank_account_id
  )
  VALUES (
    p_fixed_expense_id,
    p_paid_date,
    p_period,
    p_net_amount,
    p_iva_percent,
    v_iva_amount,
    v_total_amount,
    p_payment_method_id,
    p_bank_account_id
  )
  RETURNING *;

  IF p_period = v_current_month THEN
    UPDATE public.fixed_expenses fe
    SET is_paid = true
    WHERE fe.id = p_fixed_expense_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."mark_fixed_expense_paid"("p_fixed_expense_id" bigint, "p_paid_date" "date", "p_period" "date", "p_net_amount" numeric, "p_iva_percent" numeric, "p_payment_method_id" bigint, "p_bank_account_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."modules_files_guard_review_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_admin boolean;
  v_is_owner boolean;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid_user = auth.uid()
      AND public.is_admin_role(role)
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NOT NULL
       OR NEW.admin_description IS NOT NULL
    THEN
      RAISE EXCEPTION 'Solo un Admin puede aprobar, rechazar o modificar la devolución del archivo';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.admin_description IS DISTINCT FROM OLD.admin_description THEN
    RAISE EXCEPTION 'Solo un Admin puede modificar la devolución del archivo';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IS NOT NULL THEN
      RAISE EXCEPTION 'Solo un Admin puede aprobar o rechazar el archivo';
    END IF;

    IF OLD.status IS DISTINCT FROM 'rejected' THEN
      RAISE EXCEPTION 'Solo se pueden reenviar a revisión archivos rechazados';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = NEW.module_id
        AND m.user_id = auth.uid()
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
      RAISE EXCEPTION 'Solo el dueño del módulo puede reenviar el archivo a revisión';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."modules_files_guard_review_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."modules_guard_review_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid_user = auth.uid()
      AND public.is_admin_role(role)
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.admin_description IS NOT NULL
       OR NEW.status IN ('approved', 'rejected')
       OR NEW.amount IS NOT NULL
    THEN
      RAISE EXCEPTION 'Solo un Admin puede aprobar, rechazar o modificar la devolución del módulo';
    END IF;
  ELSE
    IF NEW.admin_description IS DISTINCT FROM OLD.admin_description
       OR (
         NEW.status IS DISTINCT FROM OLD.status
         AND NEW.status IN ('approved', 'rejected')
       )
       OR NEW.amount IS DISTINCT FROM OLD.amount
    THEN
      RAISE EXCEPTION 'Solo un Admin puede aprobar, rechazar o modificar la devolución del módulo';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."modules_guard_review_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_fixed_expenses_paid"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_period date := date_trunc('month', now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  update public.fixed_expenses fe
  set is_paid = exists (select 1 from public.fixed_expense_payments p where p.fixed_expense_id = fe.id and p.period = v_period)
  where fe.is_paid is distinct from exists (select 1 from public.fixed_expense_payments p where p.fixed_expense_id = fe.id and p.period = v_period);
end;
$$;


ALTER FUNCTION "public"."reset_fixed_expenses_paid"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_appointments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_appointments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_budget_signatures_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_budget_signatures_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_employee_evaluations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_employee_evaluations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update channels
  set last_message_id = NEW.id
  where id = NEW.channel_id;

  return NEW;
end;
$$;


ALTER FUNCTION "public"."set_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_last_read_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE channel_members
  SET last_read_message_id = NEW.id
  WHERE channel_id = NEW.channel_id
    AND user_id = NEW.user_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_last_read_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_vacation_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_vacation_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_balance_transaction_to_cash_box"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
    v_cash_box_id bigint;
begin
    -- Search for an open cash box
    select id
    into v_cash_box_id
    from public.cash_boxes
    where is_closed = false
    limit 1;

    -- If not exists, creste a new cash box
    if v_cash_box_id is null then
        insert into public.cash_boxes (
            created_at,
            is_closed
        )
        values (
            now(),
            false
        )
        returning id into v_cash_box_id;
    end if;

    -- Create a new cash box transaction
    insert into public.transactions_box (
        cash_box_id,
        type,
        category,
        description,
        bank_account_id,
        amount
    )
    values (
        v_cash_box_id,
        'income',
        new.payment_method,
        new.notes,
        new.bank_account_id,
        new.amount
    );

    return new;
end;
$$;


ALTER FUNCTION "public"."sync_balance_transaction_to_cash_box"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unmark_fixed_expense_paid"("p_fixed_expense_id" bigint) RETURNS SETOF "public"."fixed_expense_payments"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_month date := date_trunc('month', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date;
BEGIN
  RETURN QUERY
  DELETE FROM public.fixed_expense_payments fep
  WHERE fep.fixed_expense_id = p_fixed_expense_id
    AND fep.period = v_current_month
  RETURNING fep.*;

  UPDATE public.fixed_expenses fe
  SET is_paid = false
  WHERE fe.id = p_fixed_expense_id;
END;
$$;


ALTER FUNCTION "public"."unmark_fixed_expense_paid"("p_fixed_expense_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_fixed_expense_payment"("p_payment_id" bigint, "p_paid_date" "date", "p_period" "date", "p_net_amount" numeric, "p_iva_percent" numeric, "p_payment_method_id" bigint, "p_bank_account_id" bigint DEFAULT NULL::bigint) RETURNS SETOF "public"."fixed_expense_payments"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_iva_amount numeric;
  v_total_amount numeric;
  v_fixed_expense_id bigint;
  v_row public.fixed_expense_payments;
  v_current_month date := date_trunc('month', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::date;
BEGIN
  IF extract(day from p_period) <> 1 THEN
    RAISE EXCEPTION 'El período debe ser el primer día del mes';
  END IF;

  SELECT fep.fixed_expense_id INTO v_fixed_expense_id
  FROM public.fixed_expense_payments fep
  WHERE fep.id = p_payment_id;

  IF v_fixed_expense_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo editar el pago (no existe o no tenés permisos)';
  END IF;

  v_iva_amount := round(p_net_amount * p_iva_percent / 100, 2);
  v_total_amount := p_net_amount + v_iva_amount;

  -- RETURNING ... INTO a row var lets us detect a concurrent delete between the lookup above and this update
  UPDATE public.fixed_expense_payments fep
  SET
    paid_date = p_paid_date,
    period = p_period,
    net_amount = p_net_amount,
    iva_percent = p_iva_percent,
    iva_amount = v_iva_amount,
    total_amount = v_total_amount,
    payment_method_id = p_payment_method_id,
    bank_account_id = p_bank_account_id
  WHERE fep.id = p_payment_id
  RETURNING fep.* INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'No se pudo editar el pago (no existe o no tenés permisos)';
  END IF;

  UPDATE public.fixed_expenses fe
  SET is_paid = EXISTS (
    SELECT 1 FROM public.fixed_expense_payments fep2
    WHERE fep2.fixed_expense_id = fe.id
      AND fep2.period = v_current_month
  )
  WHERE fe.id = v_fixed_expense_id;

  RETURN NEXT v_row;
END;
$$;


ALTER FUNCTION "public"."update_fixed_expense_payment"("p_payment_id" bigint, "p_paid_date" "date", "p_period" "date", "p_net_amount" numeric, "p_iva_percent" numeric, "p_payment_method_id" bigint, "p_bank_account_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_push_subscriptions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_push_subscriptions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_cuit"("p_cuit" character varying) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
  -- Basic format validation: 11 digits
  IF p_cuit !~ '^\d{11}$' THEN
    RETURN FALSE;
  END IF;
  
  -- CUIT checksum validation
  -- (Implementation of official CUIT validation algorithm)
  RETURN TRUE;
END;
$_$;


ALTER FUNCTION "public"."validate_cuit"("p_cuit" character varying) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointment_blocked_dates" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "reason" "text"
);


ALTER TABLE "public"."appointment_blocked_dates" OWNER TO "postgres";


ALTER TABLE "public"."appointment_blocked_dates" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."appointment_blocked_dates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."appointment_settings" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "weekly_schedule" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "slot_duration_minutes" bigint DEFAULT 60 NOT NULL,
    "min_notice_hours" bigint DEFAULT 24 NOT NULL,
    "max_days_ahead" bigint DEFAULT 30 NOT NULL,
    "is_public_enabled" boolean DEFAULT true NOT NULL,
    "event_type_id" bigint
);


ALTER TABLE "public"."appointment_settings" OWNER TO "postgres";


ALTER TABLE "public"."appointment_settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."appointment_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "public_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_name" "text" NOT NULL,
    "client_email" "text" NOT NULL,
    "client_phone" "text",
    "date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "admin_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "event_id" bigint,
    CONSTRAINT "appointments_status_check" CHECK (("status" = ANY (ARRAY['Pendiente'::"text", 'Aceptada'::"text", 'Rechazada'::"text", 'Cancelada'::"text"]))),
    CONSTRAINT "appointments_time_check" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


ALTER TABLE "public"."appointments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."appointments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_entries" (
    "id" bigint NOT NULL,
    "attendance_id" bigint NOT NULL,
    "type" "text",
    "entry_time" timestamp with time zone,
    "latitude" numeric,
    "longitude" numeric,
    "description" "text"
);


ALTER TABLE "public"."attendance_entries" OWNER TO "postgres";


ALTER TABLE "public"."attendance_entries" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."attendance_entries_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."attendance" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."attendance_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."attendance_settings" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tolerance_quantity_minutes" bigint,
    "square_meters" bigint,
    "default_check_in_time" "text",
    "default_check_out_time" "text",
    "price_hour" numeric,
    "price_hour_overtime" numeric,
    "target_latitude" numeric,
    "target_longitude" numeric
);


ALTER TABLE "public"."attendance_settings" OWNER TO "postgres";


ALTER TABLE "public"."attendance_settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."attendance_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."balance_transactions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "balance_id" bigint,
    "date" "date",
    "amount" numeric,
    "quote_usd" numeric,
    "usd_amount" numeric,
    "notes" "text",
    "payment_method" character varying,
    "bank_account_id" bigint,
    "payment_method_id" bigint,
    "work_id" bigint,
    "receipt_number" "text",
    "category_id" bigint,
    "kind" "text" DEFAULT 'collection'::"text" NOT NULL,
    CONSTRAINT "balance_transactions_kind_check" CHECK (("kind" = 'collection'::"text")),
    CONSTRAINT "balance_transactions_receipt_number_length_check" CHECK ((("receipt_number" IS NULL) OR ("char_length"("receipt_number") <= 60)))
);


ALTER TABLE "public"."balance_transactions" OWNER TO "postgres";


ALTER TABLE "public"."balance_transactions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."balance_transactions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."balances" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "start_date" "date",
    "contract_date_usd" numeric,
    "client_id" bigint,
    "usd_current" numeric,
    "budget_id" bigint,
    "notes" "text",
    "balance_amount_ars" numeric,
    "balance_amount_usd" numeric,
    "is_settled" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."balances" OWNER TO "postgres";


ALTER TABLE "public"."balances" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."balances_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."bank_accounts" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" character varying NOT NULL,
    "bank" character varying NOT NULL,
    "account_number" character varying NOT NULL,
    "account_type" character varying NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "initial_balance" numeric DEFAULT 0 NOT NULL,
    CONSTRAINT "bank_accounts_initial_balance_decimals_check" CHECK (("initial_balance" = "round"("initial_balance", 2)))
);


ALTER TABLE "public"."bank_accounts" OWNER TO "postgres";


ALTER TABLE "public"."bank_accounts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."bank_accounts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."budget_signatures" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "budget_id" bigint NOT NULL,
    "public_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_path" "text" NOT NULL,
    "page_number" bigint DEFAULT 1 NOT NULL,
    "position_x" numeric NOT NULL,
    "position_y" numeric NOT NULL,
    "width" numeric NOT NULL,
    "height" numeric NOT NULL,
    "status" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "signer_name" "text",
    "signed_document_path" "text",
    "signed_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    CONSTRAINT "budget_signatures_page_check" CHECK (("page_number" >= 1)),
    CONSTRAINT "budget_signatures_position_check" CHECK ((("position_x" >= (0)::numeric) AND ("position_x" <= (1)::numeric) AND ("position_y" >= (0)::numeric) AND ("position_y" <= (1)::numeric) AND ("width" > (0)::numeric) AND ("width" <= (1)::numeric) AND ("height" > (0)::numeric) AND ("height" <= (1)::numeric))),
    CONSTRAINT "budget_signatures_status_check" CHECK (("status" = ANY (ARRAY['Pendiente'::"text", 'Firmado'::"text", 'Cancelado'::"text"])))
);


ALTER TABLE "public"."budget_signatures" OWNER TO "postgres";


ALTER TABLE "public"."budget_signatures" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."budget_signatures_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."budgets" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted" boolean,
    "pdf_url" "text",
    "pdf_path" "text",
    "number" "text",
    "amount_ars" numeric,
    "type" "text",
    "folder_budget_id" bigint,
    "amount_usd" numeric,
    "sold" boolean,
    "lost" boolean,
    "date_of_sale" "date",
    "usd_quote" numeric
);


ALTER TABLE "public"."budgets" OWNER TO "postgres";


ALTER TABLE "public"."budgets" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."budgets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cash_boxes" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_closed" boolean DEFAULT false NOT NULL,
    "closed_at" timestamp with time zone,
    "notes" "text",
    "opening_balance" numeric,
    "closing_balance" numeric
);


ALTER TABLE "public"."cash_boxes" OWNER TO "postgres";


ALTER TABLE "public"."cash_boxes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cash_boxes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cash_flow_categories" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "kind" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "cash_flow_categories_kind_check" CHECK (("kind" = ANY (ARRAY['income'::"text", 'expense'::"text", 'fixed_expense'::"text", 'payment'::"text", 'collection'::"text"]))),
    CONSTRAINT "cash_flow_categories_name_length_check" CHECK ((("char_length"(TRIM(BOTH FROM "name")) > 0) AND ("char_length"("name") <= 60))),
    CONSTRAINT "cash_flow_categories_name_trimmed_check" CHECK (("name" = TRIM(BOTH FROM "name")))
);


ALTER TABLE "public"."cash_flow_categories" OWNER TO "postgres";


ALTER TABLE "public"."cash_flow_categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cash_flow_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."channel_members" (
    "id" bigint NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "channel_id" bigint NOT NULL,
    "last_read_message_id" bigint,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."channel_members" OWNER TO "postgres";


ALTER TABLE "public"."channel_members" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."channel_members_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."channels" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "description" "text",
    "last_message_id" bigint
);


ALTER TABLE "public"."channels" OWNER TO "postgres";


ALTER TABLE "public"."channels" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."channels_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."checklists" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "work_id" bigint,
    "description" "text",
    "name" "text",
    "type_furniture" "text",
    "width" double precision,
    "height" double precision,
    "notes" "text",
    "depth" "text"
);


ALTER TABLE "public"."checklists" OWNER TO "postgres";


ALTER TABLE "public"."checklists" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."checklists_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."claims" (
    "id" bigint NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "client_id" bigint,
    "work_zone" "text",
    "daily" boolean,
    "alum_pvc" "text",
    "attend" "text",
    "description" "text",
    "date" "date",
    "resolved" boolean,
    "resolution_date" "date",
    "work_locality" "text",
    "work_address" "text"
);


ALTER TABLE "public"."claims" OWNER TO "postgres";


ALTER TABLE "public"."claims" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."claims_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" character varying NOT NULL,
    "last_name" character varying NOT NULL,
    "phone_number" character varying,
    "locality" character varying,
    "email" character varying,
    "cover" "text",
    "contact_method" "text",
    "referred_to" "text",
    "identity_number" "text"
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


ALTER TABLE "public"."clients" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."clients_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."collections" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "receipt_number" "text",
    "work_id" bigint,
    "category_id" bigint,
    "kind" "text" DEFAULT 'collection'::"text" NOT NULL,
    "description" "text",
    "amount" numeric NOT NULL,
    "payment_method_id" bigint NOT NULL,
    "bank_account_id" bigint,
    CONSTRAINT "collections_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "collections_amount_decimals_check" CHECK (("amount" = "round"("amount", 2))),
    CONSTRAINT "collections_description_length_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 300))),
    CONSTRAINT "collections_kind_check" CHECK (("kind" = 'collection'::"text")),
    CONSTRAINT "collections_receipt_number_length_check" CHECK ((("receipt_number" IS NULL) OR ("char_length"("receipt_number") <= 60)))
);


ALTER TABLE "public"."collections" OWNER TO "postgres";


ALTER TABLE "public"."collections" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."collections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."employee_documents" (
    "id" bigint NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "employee_id" bigint NOT NULL,
    "path" "text" NOT NULL,
    "title" "text",
    "description" "text",
    "type" "text",
    "size" bigint
);


ALTER TABLE "public"."employee_documents" OWNER TO "postgres";


ALTER TABLE "public"."employee_documents" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."employee_documents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."employee_evaluations" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "employee_id" bigint NOT NULL,
    "year" bigint NOT NULL,
    "month" bigint NOT NULL,
    "rating" smallint NOT NULL,
    "notes" "text",
    "evaluated_by" "uuid",
    CONSTRAINT "employee_evaluations_month_check" CHECK ((("month" >= 0) AND ("month" <= 11))),
    CONSTRAINT "employee_evaluations_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."employee_evaluations" OWNER TO "postgres";


ALTER TABLE "public"."employee_evaluations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."employee_evaluations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "identity_number" "text",
    "birth_date" "date",
    "phone_number" "text",
    "email" "text",
    "address" "text",
    "locality" "text",
    "position" "text",
    "hire_date" "date",
    "termination_date" "date",
    "status" "text" DEFAULT 'Activo'::"text" NOT NULL,
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "notes" "text"
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


ALTER TABLE "public"."employees" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."employees_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" character varying,
    "title" character varying,
    "client_name" character varying,
    "work_location" "text",
    "date" "date",
    "status" character varying,
    "is_overdue" boolean DEFAULT false,
    "remember" boolean DEFAULT false,
    "type_id" bigint,
    "client_id" bigint,
    "work_id" bigint,
    "time" time without time zone
);


ALTER TABLE "public"."events" OWNER TO "postgres";


ALTER TABLE "public"."events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."events_types" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "color" "text" NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."events_types" OWNER TO "postgres";


ALTER TABLE "public"."events_types" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."events_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "voucher_number" "text",
    "voucher_type_id" bigint NOT NULL,
    "work_id" bigint,
    "supplier_id" bigint NOT NULL,
    "category_id" bigint NOT NULL,
    "kind" "text" DEFAULT 'expense'::"text" NOT NULL,
    "description" "text",
    "net_amount" numeric NOT NULL,
    "iva_percent" numeric DEFAULT 0 NOT NULL,
    "iva_amount" numeric NOT NULL,
    "total_amount" numeric NOT NULL,
    CONSTRAINT "expenses_description_length_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 300))),
    CONSTRAINT "expenses_iva_amount_check" CHECK (("iva_amount" >= (0)::numeric)),
    CONSTRAINT "expenses_iva_percent_check" CHECK (("iva_percent" = ANY (ARRAY[(0)::numeric, 10.5, (21)::numeric, (27)::numeric]))),
    CONSTRAINT "expenses_kind_check" CHECK (("kind" = 'expense'::"text")),
    CONSTRAINT "expenses_net_amount_check" CHECK (("net_amount" >= (0)::numeric)),
    CONSTRAINT "expenses_net_amount_decimals_check" CHECK (("net_amount" = "round"("net_amount", 2))),
    CONSTRAINT "expenses_total_amount_check" CHECK (("total_amount" >= (0)::numeric)),
    CONSTRAINT "expenses_total_amount_sum_check" CHECK (("total_amount" = ("net_amount" + "iva_amount"))),
    CONSTRAINT "expenses_voucher_number_length_check" CHECK ((("voucher_number" IS NULL) OR ("char_length"("voucher_number") <= 60)))
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


ALTER TABLE "public"."expenses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."expenses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."files_client" (
    "id" bigint NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" bigint,
    "path" "text",
    "title" "text",
    "description" "text",
    "balance_transaction_id" bigint,
    "work_id" bigint,
    "size" numeric,
    "type" "text"
);


ALTER TABLE "public"."files_client" OWNER TO "postgres";


ALTER TABLE "public"."files_client" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."files_client_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."files_payments_suppliers" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "storage_path" "text" NOT NULL,
    "payment_supplier_id" bigint NOT NULL,
    "file_name" "text",
    "description" "text",
    CONSTRAINT "files_payments_suppliers_description_length_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 200)))
);


ALTER TABLE "public"."files_payments_suppliers" OWNER TO "postgres";


ALTER TABLE "public"."files_payments_suppliers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."files_payments_suppliers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."files_purchases_suppliers" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "storage_path" "text" NOT NULL,
    "purchase_supplier_id" bigint NOT NULL,
    "file_name" "text",
    "description" "text",
    CONSTRAINT "files_purchases_suppliers_description_length_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 200)))
);


ALTER TABLE "public"."files_purchases_suppliers" OWNER TO "postgres";


ALTER TABLE "public"."files_purchases_suppliers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."files_purchases_suppliers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."fixed_expense_payments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fixed_expense_payments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."fixed_expenses" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category_id" bigint NOT NULL,
    "kind" "text" DEFAULT 'fixed_expense'::"text" NOT NULL,
    "amount" numeric NOT NULL,
    "description" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_paid" boolean DEFAULT false NOT NULL,
    CONSTRAINT "fixed_expenses_amount_positive_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "fixed_expenses_description_length_check" CHECK ((("char_length"("description") >= 1) AND ("char_length"("description") <= 200))),
    CONSTRAINT "fixed_expenses_description_trimmed_check" CHECK (("description" = TRIM(BOTH FROM "description"))),
    CONSTRAINT "fixed_expenses_kind_check" CHECK (("kind" = 'fixed_expense'::"text"))
);


ALTER TABLE "public"."fixed_expenses" OWNER TO "postgres";


ALTER TABLE "public"."fixed_expenses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fixed_expenses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."folder_budgets" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "work_id" bigint,
    "client_id" bigint
);


ALTER TABLE "public"."folder_budgets" OWNER TO "postgres";


ALTER TABLE "public"."folder_budgets" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."folder_budgets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."gallery_checklists" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "path" "text",
    "item_id" bigint,
    "title" "text",
    "description" "text"
);


ALTER TABLE "public"."gallery_checklists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gallery_supplies" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supply_code" "text",
    "image_path" "text",
    "image_url" "text"
);


ALTER TABLE "public"."gallery_supplies" OWNER TO "postgres";


ALTER TABLE "public"."gallery_supplies" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."gallery_supplies_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."holiday_work_days" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "note" "text",
    CONSTRAINT "holiday_work_days_time_check" CHECK (((("start_time" IS NULL) AND ("end_time" IS NULL)) OR (("start_time" IS NOT NULL) AND ("end_time" IS NOT NULL) AND ("end_time" > "start_time"))))
);


ALTER TABLE "public"."holiday_work_days" OWNER TO "postgres";


ALTER TABLE "public"."holiday_work_days" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."holiday_work_days_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."gallery_checklists" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."images_checklists_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."incomes" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "voucher_number" "text",
    "voucher_type_id" bigint NOT NULL,
    "work_id" bigint,
    "client_id" bigint NOT NULL,
    "category_id" bigint NOT NULL,
    "kind" "text" DEFAULT 'income'::"text" NOT NULL,
    "description" "text",
    "net_amount" numeric NOT NULL,
    "iva_percent" numeric DEFAULT 0 NOT NULL,
    "iva_amount" numeric NOT NULL,
    "total_amount" numeric NOT NULL,
    CONSTRAINT "incomes_description_length_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 300))),
    CONSTRAINT "incomes_iva_amount_check" CHECK (("iva_amount" >= (0)::numeric)),
    CONSTRAINT "incomes_iva_percent_check" CHECK (("iva_percent" = ANY (ARRAY[(0)::numeric, 10.5, (21)::numeric, (27)::numeric]))),
    CONSTRAINT "incomes_kind_check" CHECK (("kind" = 'income'::"text")),
    CONSTRAINT "incomes_net_amount_check" CHECK (("net_amount" >= (0)::numeric)),
    CONSTRAINT "incomes_net_amount_decimals_check" CHECK (("net_amount" = "round"("net_amount", 2))),
    CONSTRAINT "incomes_total_amount_check" CHECK (("total_amount" >= (0)::numeric)),
    CONSTRAINT "incomes_total_amount_sum_check" CHECK (("total_amount" = ("net_amount" + "iva_amount"))),
    CONSTRAINT "incomes_voucher_number_length_check" CHECK ((("voucher_number" IS NULL) OR ("char_length"("voucher_number") <= 60)))
);


ALTER TABLE "public"."incomes" OWNER TO "postgres";


ALTER TABLE "public"."incomes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."incomes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."items_checklists" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "checklist_id" bigint,
    "description" "text",
    "done" boolean,
    "sort_order" numeric
);


ALTER TABLE "public"."items_checklists" OWNER TO "postgres";


ALTER TABLE "public"."items_checklists" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."items_checklists_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."items_predefined" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "items" "jsonb",
    "material_id" bigint
);


ALTER TABLE "public"."items_predefined" OWNER TO "postgres";


ALTER TABLE "public"."items_predefined" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."items_predefined_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."kanban_board_members" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "board_id" bigint NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."kanban_board_members" OWNER TO "postgres";


ALTER TABLE "public"."kanban_board_members" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."kanban_board_members_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."kanban_boards" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" character varying(7) DEFAULT '#4F5C4D'::character varying,
    "due_date_tolerance_yellow" integer DEFAULT 2,
    "due_date_tolerance_red" integer DEFAULT 0
);


ALTER TABLE "public"."kanban_boards" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."kanban_boards_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."kanban_boards_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."kanban_boards_id_seq" OWNED BY "public"."kanban_boards"."id";



CREATE TABLE IF NOT EXISTS "public"."kanban_cards" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "list_id" bigint NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "position" integer DEFAULT 0,
    "due_date" timestamp with time zone,
    "priority" character varying(20) DEFAULT 'none'::character varying,
    "completed_at" timestamp with time zone,
    "client_id" bigint,
    "work_id" bigint,
    CONSTRAINT "kanban_cards_priority_check" CHECK ((("priority")::"text" = ANY ((ARRAY['none'::character varying, 'low'::character varying, 'medium'::character varying, 'high'::character varying, 'very_high'::character varying])::"text"[])))
);


ALTER TABLE "public"."kanban_cards" OWNER TO "postgres";


ALTER TABLE "public"."kanban_cards" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."kanban_cards_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."kanban_files" (
    "id" bigint NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "kanban_card_id" bigint,
    "path" "text",
    "display_name" "text"
);


ALTER TABLE "public"."kanban_files" OWNER TO "postgres";


ALTER TABLE "public"."kanban_files" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."kanban_files_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."kanban_lists" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "board_id" bigint NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."kanban_lists" OWNER TO "postgres";


ALTER TABLE "public"."kanban_lists" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."kanban_lists_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."materials" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."materials" OWNER TO "postgres";


ALTER TABLE "public"."materials" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."materials_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "text",
    "channel_id" bigint,
    "edited_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "reply_to" bigint,
    "user_id" "uuid"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


ALTER TABLE "public"."messages" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text",
    "title" "text",
    "description" "text",
    "amount" numeric,
    "work_id" bigint,
    "admin_description" "text"
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modules_files" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "storage_path" "text" NOT NULL,
    "module_id" bigint NOT NULL,
    "file_name" "text",
    "description" "text",
    "admin_description" "text",
    "status" "text"
);


ALTER TABLE "public"."modules_files" OWNER TO "postgres";


ALTER TABLE "public"."modules_files" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."modules_files_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."modules" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."modules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."modules_monthly_settlements" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "year" bigint NOT NULL,
    "month" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "modules_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "modules_monthly_settlements_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "modules_monthly_settlements_modules_count_check" CHECK (("modules_count" >= 0)),
    CONSTRAINT "modules_monthly_settlements_month_check" CHECK ((("month" >= 0) AND ("month" <= 11)))
);


ALTER TABLE "public"."modules_monthly_settlements" OWNER TO "postgres";


ALTER TABLE "public"."modules_monthly_settlements" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."modules_monthly_settlements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."modules_settings" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "price_per_module" numeric,
    CONSTRAINT "modules_settings_price_nonneg" CHECK ((("price_per_module" IS NULL) OR ("price_per_module" >= (0)::numeric)))
);


ALTER TABLE "public"."modules_settings" OWNER TO "postgres";


ALTER TABLE "public"."modules_settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."modules_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."monthly_settlements" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "year" bigint NOT NULL,
    "month" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "number_hours" numeric NOT NULL,
    "number_overtime_hours" numeric NOT NULL,
    "price_hour" numeric NOT NULL,
    "price_overtime_hour" numeric NOT NULL
);


ALTER TABLE "public"."monthly_settlements" OWNER TO "postgres";


ALTER TABLE "public"."monthly_settlements" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."monthly_settlements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "payment_methods_name_length_check" CHECK (("char_length"("name") <= 60))
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


ALTER TABLE "public"."payment_methods" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."payment_methods_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "date" "date" NOT NULL,
    "receipt_number" "text",
    "work_id" bigint,
    "category_id" bigint,
    "kind" "text" DEFAULT 'payment'::"text" NOT NULL,
    "description" "text",
    "amount" numeric NOT NULL,
    "payment_method_id" bigint NOT NULL,
    "bank_account_id" bigint,
    CONSTRAINT "payments_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "payments_amount_decimals_check" CHECK (("amount" = "round"("amount", 2))),
    CONSTRAINT "payments_description_length_check" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 300))),
    CONSTRAINT "payments_kind_check" CHECK (("kind" = 'payment'::"text")),
    CONSTRAINT "payments_receipt_number_length_check" CHECK ((("receipt_number" IS NULL) OR ("char_length"("receipt_number") <= 60)))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


ALTER TABLE "public"."payments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."payments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."payments_suppliers" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount_ars" numeric NOT NULL,
    "bank_account_id" bigint,
    "payment_method_id" bigint,
    "purchase_supplier_id" bigint NOT NULL,
    "notes" "text",
    "paid_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "receipt_number" "text",
    "work_id" bigint,
    "category_id" bigint,
    "kind" "text" DEFAULT 'payment'::"text" NOT NULL,
    CONSTRAINT "payments_suppliers_amount_ars_check" CHECK (("amount_ars" > (0)::numeric)),
    CONSTRAINT "payments_suppliers_amount_ars_decimals_check" CHECK (("amount_ars" = "round"("amount_ars", 2))),
    CONSTRAINT "payments_suppliers_kind_check" CHECK (("kind" = 'payment'::"text")),
    CONSTRAINT "payments_suppliers_notes_length_check" CHECK ((("notes" IS NULL) OR ("char_length"("notes") <= 2000))),
    CONSTRAINT "payments_suppliers_receipt_number_length_check" CHECK ((("receipt_number" IS NULL) OR ("char_length"("receipt_number") <= 60)))
);


ALTER TABLE "public"."payments_suppliers" OWNER TO "postgres";


ALTER TABLE "public"."payments_suppliers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."payments_suppliers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."purchases_suppliers" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount_ars" numeric NOT NULL,
    "supplier_id" bigint NOT NULL,
    "notes" "text",
    CONSTRAINT "purchases_suppliers_amount_ars_check" CHECK (("amount_ars" > (0)::numeric)),
    CONSTRAINT "purchases_suppliers_notes_length_check" CHECK ((("notes" IS NULL) OR ("char_length"("notes") <= 2000)))
);


ALTER TABLE "public"."purchases_suppliers" OWNER TO "postgres";


ALTER TABLE "public"."purchases_suppliers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchases_suppliers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" bigint NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."push_subscriptions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."push_subscriptions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."push_subscriptions_id_seq" OWNED BY "public"."push_subscriptions"."id";



CREATE TABLE IF NOT EXISTS "public"."stock_supplies" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supply_line" character varying,
    "supply_code" character varying NOT NULL,
    "supply_description" character varying,
    "supply_color" character varying NOT NULL,
    "supply_quantity_for_lump" bigint NOT NULL,
    "supply_quantity_lump" bigint NOT NULL,
    "supply_quantity" bigint NOT NULL,
    "supply_site" character varying NOT NULL,
    "image_id" bigint,
    "supply_material" character varying NOT NULL,
    "supply_price" numeric(10,2),
    "supply_category" character varying NOT NULL,
    "last_update" timestamp without time zone,
    "supply_brand" character varying,
    CONSTRAINT "chk_supply_price_non_negative" CHECK (("supply_price" >= (0)::numeric)),
    CONSTRAINT "chk_supply_quantity_for_lump_non_negative" CHECK (("supply_quantity_for_lump" >= 0)),
    CONSTRAINT "chk_supply_quantity_lump_non_negative" CHECK (("supply_quantity_lump" >= 0)),
    CONSTRAINT "chk_supply_quantity_non_negative" CHECK (("supply_quantity" >= 0))
);


ALTER TABLE "public"."stock_supplies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "business_name" "text",
    "tax_id" "text",
    "whatsapp" "text",
    "email" "text",
    "category" "text",
    "locality" "text",
    "address" "text",
    "payment_terms_days" integer,
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "suppliers_address_length_check" CHECK ((("address" IS NULL) OR ("char_length"("address") <= 200))),
    CONSTRAINT "suppliers_email_length_check" CHECK ((("email" IS NULL) OR ("char_length"("email") <= 254))),
    CONSTRAINT "suppliers_locality_length_check" CHECK ((("locality" IS NULL) OR ("char_length"("locality") <= 120))),
    CONSTRAINT "suppliers_name_length_check" CHECK (("char_length"("name") <= 120)),
    CONSTRAINT "suppliers_notes_length_check" CHECK ((("notes" IS NULL) OR ("char_length"("notes") <= 2000))),
    CONSTRAINT "suppliers_payment_terms_days_check" CHECK ((("payment_terms_days" IS NULL) OR (("payment_terms_days" >= 0) AND ("payment_terms_days" <= 3650)))),
    CONSTRAINT "suppliers_tax_id_format_check" CHECK ((("tax_id" IS NULL) OR ("tax_id" ~ '^[0-9]{11}$'::"text")))
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


ALTER TABLE "public"."suppliers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."suppliers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."stock_supplies" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."supplies_category_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."transactions_box" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cash_box_id" bigint NOT NULL,
    "type" character varying NOT NULL,
    "category" character varying NOT NULL,
    "description" character varying,
    "bank_account_id" bigint,
    "amount" numeric DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE "public"."transactions_box" OWNER TO "postgres";


ALTER TABLE "public"."transactions_box" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."transactions_box_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" bigint NOT NULL,
    "username" character varying NOT NULL,
    "role" character varying NOT NULL,
    "uid_user" "uuid" NOT NULL,
    "mail" "text",
    "name" "text",
    "last_name" "text",
    "views" "jsonb"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE "public"."users" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."users_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."vacation_requests" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text",
    "status" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "reviewer_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "vacation_requests_dates_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "vacation_requests_status_check" CHECK (("status" = ANY (ARRAY['Pendiente'::"text", 'Aprobada'::"text", 'Rechazada'::"text"])))
);


ALTER TABLE "public"."vacation_requests" OWNER TO "postgres";


ALTER TABLE "public"."vacation_requests" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."vacation_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."voucher_types" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "voucher_types_name_length_check" CHECK ((("char_length"(TRIM(BOTH FROM "name")) > 0) AND ("char_length"("name") <= 60))),
    CONSTRAINT "voucher_types_name_trimmed_check" CHECK (("name" = TRIM(BOTH FROM "name")))
);


ALTER TABLE "public"."voucher_types" OWNER TO "postgres";


ALTER TABLE "public"."voucher_types" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."voucher_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."works" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "locality" character varying,
    "address" character varying,
    "client_id" bigint,
    "status" character varying,
    "architect" character varying,
    "general_note" character varying,
    "furniture" "text",
    "zone" "text",
    "hood" "text",
    "name" "text",
    "completion_date" "date"
);


ALTER TABLE "public"."works" OWNER TO "postgres";


ALTER TABLE "public"."works" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."works_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."kanban_boards" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."kanban_boards_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."push_subscriptions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."push_subscriptions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."appointment_blocked_dates"
    ADD CONSTRAINT "appointment_blocked_dates_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."appointment_blocked_dates"
    ADD CONSTRAINT "appointment_blocked_dates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointment_settings"
    ADD CONSTRAINT "appointment_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_public_token_key" UNIQUE ("public_token");



ALTER TABLE ONLY "public"."attendance_entries"
    ADD CONSTRAINT "attendance_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_settings"
    ADD CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balance_transactions"
    ADD CONSTRAINT "balance_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."balances"
    ADD CONSTRAINT "balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_signatures"
    ADD CONSTRAINT "budget_signatures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_signatures"
    ADD CONSTRAINT "budget_signatures_public_token_key" UNIQUE ("public_token");



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_boxes"
    ADD CONSTRAINT "cash_boxes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_flow_categories"
    ADD CONSTRAINT "cash_flow_categories_id_kind_unique" UNIQUE ("id", "kind");



ALTER TABLE ONLY "public"."cash_flow_categories"
    ADD CONSTRAINT "cash_flow_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_channel_user_key" UNIQUE ("channel_id", "user_id");



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."channels"
    ADD CONSTRAINT "channels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklists"
    ADD CONSTRAINT "checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_identity_number_key" UNIQUE ("identity_number");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_documents"
    ADD CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_evaluations"
    ADD CONSTRAINT "employee_evaluations_employee_year_month_unique" UNIQUE ("employee_id", "year", "month");



ALTER TABLE ONLY "public"."employee_evaluations"
    ADD CONSTRAINT "employee_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events_types"
    ADD CONSTRAINT "events_types_color_key" UNIQUE ("color");



ALTER TABLE ONLY "public"."events_types"
    ADD CONSTRAINT "events_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."events_types"
    ADD CONSTRAINT "events_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."files_client"
    ADD CONSTRAINT "files_client_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."files_payments_suppliers"
    ADD CONSTRAINT "files_payments_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."files_payments_suppliers"
    ADD CONSTRAINT "files_payments_suppliers_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."files_purchases_suppliers"
    ADD CONSTRAINT "files_purchases_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."files_purchases_suppliers"
    ADD CONSTRAINT "files_purchases_suppliers_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."fixed_expense_payments"
    ADD CONSTRAINT "fixed_expense_payments_fixed_expense_id_period_unique" UNIQUE ("fixed_expense_id", "period");



ALTER TABLE ONLY "public"."fixed_expense_payments"
    ADD CONSTRAINT "fixed_expense_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fixed_expenses"
    ADD CONSTRAINT "fixed_expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."folder_budgets"
    ADD CONSTRAINT "folder_budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_supplies"
    ADD CONSTRAINT "gallery_supplies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."holiday_work_days"
    ADD CONSTRAINT "holiday_work_days_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."holiday_work_days"
    ADD CONSTRAINT "holiday_work_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_checklists"
    ADD CONSTRAINT "images_checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items_checklists"
    ADD CONSTRAINT "items_checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."items_predefined"
    ADD CONSTRAINT "items_predefined_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kanban_board_members"
    ADD CONSTRAINT "kanban_board_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kanban_boards"
    ADD CONSTRAINT "kanban_boards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kanban_cards"
    ADD CONSTRAINT "kanban_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kanban_files"
    ADD CONSTRAINT "kanban_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kanban_lists"
    ADD CONSTRAINT "kanban_lists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules_files"
    ADD CONSTRAINT "modules_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules_monthly_settlements"
    ADD CONSTRAINT "modules_monthly_settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules_monthly_settlements"
    ADD CONSTRAINT "modules_monthly_settlements_user_year_month_unique" UNIQUE ("user_id", "year", "month");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules_settings"
    ADD CONSTRAINT "modules_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_settlements"
    ADD CONSTRAINT "monthly_settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_settlements"
    ADD CONSTRAINT "monthly_settlements_user_year_month_unique" UNIQUE ("user_id", "year", "month");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments_suppliers"
    ADD CONSTRAINT "payments_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchases_suppliers"
    ADD CONSTRAINT "purchases_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_supplies"
    ADD CONSTRAINT "supplies_category_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions_box"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_uid_user_key" UNIQUE ("uid_user");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."vacation_requests"
    ADD CONSTRAINT "vacation_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voucher_types"
    ADD CONSTRAINT "voucher_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."works"
    ADD CONSTRAINT "works_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "appointments_active_slot_idx" ON "public"."appointments" USING "btree" ("date", "start_time") WHERE ("status" = ANY (ARRAY['Pendiente'::"text", 'Aceptada'::"text"]));



CREATE INDEX "appointments_client_email_trgm_idx" ON "public"."appointments" USING "gin" ("client_email" "public"."gin_trgm_ops");



CREATE INDEX "appointments_client_name_trgm_idx" ON "public"."appointments" USING "gin" ("client_name" "public"."gin_trgm_ops");



CREATE INDEX "appointments_date_idx" ON "public"."appointments" USING "btree" ("date");



CREATE INDEX "appointments_status_idx" ON "public"."appointments" USING "btree" ("status");



CREATE INDEX "balance_transactions_bank_account_id_idx" ON "public"."balance_transactions" USING "btree" ("bank_account_id");



CREATE INDEX "balance_transactions_category_id_idx" ON "public"."balance_transactions" USING "btree" ("category_id");



CREATE INDEX "balance_transactions_payment_method_id_idx" ON "public"."balance_transactions" USING "btree" ("payment_method_id");



CREATE INDEX "balance_transactions_work_id_idx" ON "public"."balance_transactions" USING "btree" ("work_id");



CREATE UNIQUE INDEX "budget_signatures_active_budget_idx" ON "public"."budget_signatures" USING "btree" ("budget_id") WHERE ("status" = 'Pendiente'::"text");



CREATE INDEX "budget_signatures_budget_id_idx" ON "public"."budget_signatures" USING "btree" ("budget_id");



CREATE INDEX "budgets_number_trgm_idx" ON "public"."budgets" USING "gin" ("number" "public"."gin_trgm_ops");



CREATE UNIQUE INDEX "cash_flow_categories_kind_name_unique_idx" ON "public"."cash_flow_categories" USING "btree" ("kind", "lower"(TRIM(BOTH FROM "name")));



CREATE INDEX "clients_identity_number_trgm_idx" ON "public"."clients" USING "gin" ("identity_number" "public"."gin_trgm_ops");



CREATE INDEX "clients_last_name_trgm_idx" ON "public"."clients" USING "gin" ("last_name" "public"."gin_trgm_ops");



CREATE INDEX "clients_locality_trgm_idx" ON "public"."clients" USING "gin" ("locality" "public"."gin_trgm_ops");



CREATE INDEX "clients_name_trgm_idx" ON "public"."clients" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "collections_category_id_idx" ON "public"."collections" USING "btree" ("category_id");



CREATE INDEX "collections_date_idx" ON "public"."collections" USING "btree" ("date");



CREATE INDEX "collections_payment_method_id_idx" ON "public"."collections" USING "btree" ("payment_method_id");



CREATE INDEX "collections_work_id_idx" ON "public"."collections" USING "btree" ("work_id");



CREATE INDEX "employee_documents_employee_id_idx" ON "public"."employee_documents" USING "btree" ("employee_id");



CREATE INDEX "employee_evaluations_employee_id_idx" ON "public"."employee_evaluations" USING "btree" ("employee_id");



CREATE INDEX "employee_evaluations_period_idx" ON "public"."employee_evaluations" USING "btree" ("year", "month");



CREATE INDEX "employees_identity_number_trgm_idx" ON "public"."employees" USING "gin" ("identity_number" "public"."gin_trgm_ops");



CREATE INDEX "employees_last_name_idx" ON "public"."employees" USING "btree" ("last_name");



CREATE INDEX "employees_last_name_trgm_idx" ON "public"."employees" USING "gin" ("last_name" "public"."gin_trgm_ops");



CREATE INDEX "employees_name_trgm_idx" ON "public"."employees" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "employees_position_trgm_idx" ON "public"."employees" USING "gin" ("position" "public"."gin_trgm_ops");



CREATE INDEX "events_client_name_trgm_idx" ON "public"."events" USING "gin" ("client_name" "public"."gin_trgm_ops");



CREATE INDEX "events_description_trgm_idx" ON "public"."events" USING "gin" ("description" "public"."gin_trgm_ops");



CREATE INDEX "events_title_trgm_idx" ON "public"."events" USING "gin" ("title" "public"."gin_trgm_ops");



CREATE INDEX "expenses_category_id_idx" ON "public"."expenses" USING "btree" ("category_id");



CREATE INDEX "expenses_date_idx" ON "public"."expenses" USING "btree" ("date");



CREATE INDEX "expenses_supplier_id_idx" ON "public"."expenses" USING "btree" ("supplier_id");



CREATE INDEX "expenses_voucher_type_id_idx" ON "public"."expenses" USING "btree" ("voucher_type_id");



CREATE INDEX "expenses_work_id_idx" ON "public"."expenses" USING "btree" ("work_id");



CREATE INDEX "files_payments_suppliers_payment_id_idx" ON "public"."files_payments_suppliers" USING "btree" ("payment_supplier_id");



CREATE INDEX "files_purchases_suppliers_purchase_id_idx" ON "public"."files_purchases_suppliers" USING "btree" ("purchase_supplier_id");



CREATE INDEX "fixed_expense_payments_fixed_expense_id_idx" ON "public"."fixed_expense_payments" USING "btree" ("fixed_expense_id");



CREATE INDEX "fixed_expense_payments_period_idx" ON "public"."fixed_expense_payments" USING "btree" ("period");



CREATE INDEX "fixed_expenses_category_id_idx" ON "public"."fixed_expenses" USING "btree" ("category_id");



CREATE INDEX "idx_attendance_entries_attendance_id" ON "public"."attendance_entries" USING "btree" ("attendance_id");



CREATE INDEX "idx_attendance_entries_attendance_time" ON "public"."attendance_entries" USING "btree" ("attendance_id", "entry_time" DESC);



CREATE UNIQUE INDEX "idx_attendance_user_date" ON "public"."attendance" USING "btree" ("user_id", "date");



CREATE INDEX "idx_cards_list_position" ON "public"."kanban_cards" USING "btree" ("list_id", "position");



CREATE INDEX "idx_channel_members_user_channel" ON "public"."channel_members" USING "btree" ("user_id", "channel_id");



CREATE INDEX "idx_files_card" ON "public"."kanban_files" USING "btree" ("kanban_card_id");



CREATE UNIQUE INDEX "idx_kanban_board_members_unique" ON "public"."kanban_board_members" USING "btree" ("board_id", "user_id");



CREATE INDEX "idx_kanban_cards_client_id" ON "public"."kanban_cards" USING "btree" ("client_id");



CREATE INDEX "idx_kanban_cards_work_id" ON "public"."kanban_cards" USING "btree" ("work_id");



CREATE INDEX "idx_kanban_lists_board" ON "public"."kanban_lists" USING "btree" ("board_id");



CREATE INDEX "idx_messages_channel_created" ON "public"."messages" USING "btree" ("channel_id", "created_at" DESC);



CREATE INDEX "idx_messages_channel_id_id" ON "public"."messages" USING "btree" ("channel_id", "id");



CREATE INDEX "idx_modules_files_module_id" ON "public"."modules_files" USING "btree" ("module_id");



CREATE UNIQUE INDEX "idx_modules_files_storage_path" ON "public"."modules_files" USING "btree" ("storage_path");



CREATE INDEX "idx_modules_monthly_settlements_user_id" ON "public"."modules_monthly_settlements" USING "btree" ("user_id");



CREATE INDEX "idx_modules_status" ON "public"."modules" USING "btree" ("status");



CREATE INDEX "idx_modules_user_id" ON "public"."modules" USING "btree" ("user_id");



CREATE INDEX "idx_monthly_settlements_user_id" ON "public"."monthly_settlements" USING "btree" ("user_id");



CREATE INDEX "idx_push_subscriptions_user_id" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_box_bank_account" ON "public"."transactions_box" USING "btree" ("bank_account_id");



CREATE INDEX "idx_transactions_box_cashbox_created" ON "public"."transactions_box" USING "btree" ("cash_box_id", "created_at" DESC);



CREATE INDEX "incomes_category_id_idx" ON "public"."incomes" USING "btree" ("category_id");



CREATE INDEX "incomes_client_id_idx" ON "public"."incomes" USING "btree" ("client_id");



CREATE INDEX "incomes_date_idx" ON "public"."incomes" USING "btree" ("date");



CREATE INDEX "incomes_voucher_type_id_idx" ON "public"."incomes" USING "btree" ("voucher_type_id");



CREATE INDEX "incomes_work_id_idx" ON "public"."incomes" USING "btree" ("work_id");



CREATE INDEX "kanban_cards_description_trgm_idx" ON "public"."kanban_cards" USING "gin" ("description" "public"."gin_trgm_ops");



CREATE INDEX "kanban_cards_title_trgm_idx" ON "public"."kanban_cards" USING "gin" ("title" "public"."gin_trgm_ops");



CREATE UNIQUE INDEX "one_open_cash_box" ON "public"."cash_boxes" USING "btree" ("is_closed") WHERE ("is_closed" = false);



CREATE UNIQUE INDEX "payment_methods_name_unique_idx" ON "public"."payment_methods" USING "btree" ("lower"("name"));



CREATE INDEX "payments_category_id_idx" ON "public"."payments" USING "btree" ("category_id");



CREATE INDEX "payments_date_idx" ON "public"."payments" USING "btree" ("date");



CREATE INDEX "payments_payment_method_id_idx" ON "public"."payments" USING "btree" ("payment_method_id");



CREATE INDEX "payments_suppliers_bank_account_id_idx" ON "public"."payments_suppliers" USING "btree" ("bank_account_id");



CREATE INDEX "payments_suppliers_category_id_idx" ON "public"."payments_suppliers" USING "btree" ("category_id");



CREATE INDEX "payments_suppliers_paid_date_idx" ON "public"."payments_suppliers" USING "btree" ("paid_date");



CREATE INDEX "payments_suppliers_payment_method_id_idx" ON "public"."payments_suppliers" USING "btree" ("payment_method_id");



CREATE INDEX "payments_suppliers_purchase_supplier_id_idx" ON "public"."payments_suppliers" USING "btree" ("purchase_supplier_id");



CREATE INDEX "payments_suppliers_work_id_idx" ON "public"."payments_suppliers" USING "btree" ("work_id");



CREATE INDEX "payments_work_id_idx" ON "public"."payments" USING "btree" ("work_id");



CREATE INDEX "purchases_suppliers_supplier_id_idx" ON "public"."purchases_suppliers" USING "btree" ("supplier_id");



CREATE INDEX "stock_supplies_brand_trgm_idx" ON "public"."stock_supplies" USING "gin" ("supply_brand" "public"."gin_trgm_ops");



CREATE INDEX "stock_supplies_category_trgm_idx" ON "public"."stock_supplies" USING "gin" ("supply_category" "public"."gin_trgm_ops");



CREATE INDEX "stock_supplies_code_trgm_idx" ON "public"."stock_supplies" USING "gin" ("supply_code" "public"."gin_trgm_ops");



CREATE INDEX "stock_supplies_description_trgm_idx" ON "public"."stock_supplies" USING "gin" ("supply_description" "public"."gin_trgm_ops");



CREATE INDEX "suppliers_name_lower_idx" ON "public"."suppliers" USING "btree" ("lower"("name"));



CREATE UNIQUE INDEX "suppliers_tax_id_unique_idx" ON "public"."suppliers" USING "btree" ("tax_id") WHERE ("tax_id" IS NOT NULL);



CREATE INDEX "vacation_requests_status_idx" ON "public"."vacation_requests" USING "btree" ("status");



CREATE INDEX "vacation_requests_user_id_idx" ON "public"."vacation_requests" USING "btree" ("user_id");



CREATE UNIQUE INDEX "voucher_types_name_unique_idx" ON "public"."voucher_types" USING "btree" ("lower"(TRIM(BOTH FROM "name")));



CREATE INDEX "works_address_trgm_idx" ON "public"."works" USING "gin" ("address" "public"."gin_trgm_ops");



CREATE INDEX "works_locality_trgm_idx" ON "public"."works" USING "gin" ("locality" "public"."gin_trgm_ops");



CREATE INDEX "works_name_trgm_idx" ON "public"."works" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE OR REPLACE TRIGGER "appointment_settings_set_updated_at" BEFORE UPDATE ON "public"."appointment_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_appointments_updated_at"();



CREATE OR REPLACE TRIGGER "appointments_set_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."set_appointments_updated_at"();



CREATE OR REPLACE TRIGGER "budget_signatures_set_updated_at" BEFORE UPDATE ON "public"."budget_signatures" FOR EACH ROW EXECUTE FUNCTION "public"."set_budget_signatures_updated_at"();



CREATE OR REPLACE TRIGGER "employee_evaluations_set_updated_at" BEFORE UPDATE ON "public"."employee_evaluations" FOR EACH ROW EXECUTE FUNCTION "public"."set_employee_evaluations_updated_at"();



CREATE OR REPLACE TRIGGER "push_subscriptions_updated_at" BEFORE UPDATE ON "public"."push_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_push_subscriptions_updated_at"();



CREATE OR REPLACE TRIGGER "trg_expenses_compute_iva_and_total" BEFORE INSERT OR UPDATE ON "public"."expenses" FOR EACH ROW EXECUTE FUNCTION "public"."expenses_compute_iva_and_total"();



CREATE OR REPLACE TRIGGER "trg_incomes_compute_iva_and_total" BEFORE INSERT OR UPDATE ON "public"."incomes" FOR EACH ROW EXECUTE FUNCTION "public"."incomes_compute_iva_and_total"();



CREATE OR REPLACE TRIGGER "trg_modules_files_guard_review_columns" BEFORE INSERT OR UPDATE ON "public"."modules_files" FOR EACH ROW EXECUTE FUNCTION "public"."modules_files_guard_review_columns"();



CREATE OR REPLACE TRIGGER "trg_modules_guard_review_columns" BEFORE INSERT OR UPDATE ON "public"."modules" FOR EACH ROW EXECUTE FUNCTION "public"."modules_guard_review_columns"();



CREATE OR REPLACE TRIGGER "trg_set_last_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."set_last_message"();



CREATE OR REPLACE TRIGGER "trg_set_last_read_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."set_last_read_message"();



CREATE OR REPLACE TRIGGER "trg_sync_balance_transaction_to_cash_box" AFTER INSERT ON "public"."balance_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_balance_transaction_to_cash_box"();



CREATE OR REPLACE TRIGGER "vacation_requests_set_updated_at" BEFORE UPDATE ON "public"."vacation_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_vacation_requests_updated_at"();



ALTER TABLE ONLY "public"."appointment_settings"
    ADD CONSTRAINT "appointment_settings_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "public"."events_types"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance_entries"
    ADD CONSTRAINT "attendance_entries_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "public"."attendance"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_user_uid_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."balance_transactions"
    ADD CONSTRAINT "balance_transactions_balance_id_fkey" FOREIGN KEY ("balance_id") REFERENCES "public"."balances"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."balance_transactions"
    ADD CONSTRAINT "balance_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."balance_transactions"
    ADD CONSTRAINT "balance_transactions_category_id_kind_fkey" FOREIGN KEY ("category_id", "kind") REFERENCES "public"."cash_flow_categories"("id", "kind") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."balance_transactions"
    ADD CONSTRAINT "balance_transactions_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."balance_transactions"
    ADD CONSTRAINT "balance_transactions_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."balances"
    ADD CONSTRAINT "balances_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."balances"
    ADD CONSTRAINT "balances_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_signatures"
    ADD CONSTRAINT "budget_signatures_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_signatures"
    ADD CONSTRAINT "budget_signatures_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budgets"
    ADD CONSTRAINT "budgets_folder_budget_id_fkey" FOREIGN KEY ("folder_budget_id") REFERENCES "public"."folder_budgets"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_last_read_message_id_fkey" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."channel_members"
    ADD CONSTRAINT "channel_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklists"
    ADD CONSTRAINT "checklists_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_category_id_kind_fkey" FOREIGN KEY ("category_id", "kind") REFERENCES "public"."cash_flow_categories"("id", "kind") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employee_documents"
    ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_evaluations"
    ADD CONSTRAINT "employee_evaluations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_evaluations"
    ADD CONSTRAINT "employee_evaluations_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "public"."events_types"("id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_category_id_kind_fkey" FOREIGN KEY ("category_id", "kind") REFERENCES "public"."cash_flow_categories"("id", "kind") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_voucher_type_id_fkey" FOREIGN KEY ("voucher_type_id") REFERENCES "public"."voucher_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."files_client"
    ADD CONSTRAINT "files_client_balance_transaction_id_fkey" FOREIGN KEY ("balance_transaction_id") REFERENCES "public"."balance_transactions"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."files_client"
    ADD CONSTRAINT "files_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."files_client"
    ADD CONSTRAINT "files_client_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."files_payments_suppliers"
    ADD CONSTRAINT "files_payments_suppliers_payment_id_fkey" FOREIGN KEY ("payment_supplier_id") REFERENCES "public"."payments_suppliers"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."files_purchases_suppliers"
    ADD CONSTRAINT "files_purchases_suppliers_purchase_id_fkey" FOREIGN KEY ("purchase_supplier_id") REFERENCES "public"."purchases_suppliers"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fixed_expense_payments"
    ADD CONSTRAINT "fixed_expense_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fixed_expense_payments"
    ADD CONSTRAINT "fixed_expense_payments_fixed_expense_id_fkey" FOREIGN KEY ("fixed_expense_id") REFERENCES "public"."fixed_expenses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fixed_expense_payments"
    ADD CONSTRAINT "fixed_expense_payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fixed_expenses"
    ADD CONSTRAINT "fixed_expenses_category_id_kind_fkey" FOREIGN KEY ("category_id", "kind") REFERENCES "public"."cash_flow_categories"("id", "kind") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."folder_budgets"
    ADD CONSTRAINT "folder_budgets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."folder_budgets"
    ADD CONSTRAINT "folder_budgets_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gallery_checklists"
    ADD CONSTRAINT "images_checklists_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items_checklists"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_category_id_kind_fkey" FOREIGN KEY ("category_id", "kind") REFERENCES "public"."cash_flow_categories"("id", "kind") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_voucher_type_id_fkey" FOREIGN KEY ("voucher_type_id") REFERENCES "public"."voucher_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."incomes"
    ADD CONSTRAINT "incomes_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."items_checklists"
    ADD CONSTRAINT "items_checklists_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."items_predefined"
    ADD CONSTRAINT "items_predefined_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kanban_board_members"
    ADD CONSTRAINT "kanban_board_members_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kanban_board_members"
    ADD CONSTRAINT "kanban_board_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kanban_cards"
    ADD CONSTRAINT "kanban_cards_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kanban_cards"
    ADD CONSTRAINT "kanban_cards_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."kanban_lists"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kanban_cards"
    ADD CONSTRAINT "kanban_cards_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kanban_files"
    ADD CONSTRAINT "kanban_files_kanban_card_id_fkey" FOREIGN KEY ("kanban_card_id") REFERENCES "public"."kanban_cards"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kanban_lists"
    ADD CONSTRAINT "kanban_lists_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_reply_to_fkey" FOREIGN KEY ("reply_to") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modules_files"
    ADD CONSTRAINT "modules_files_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modules_monthly_settlements"
    ADD CONSTRAINT "modules_monthly_settlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."monthly_settlements"
    ADD CONSTRAINT "monthly_settlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_category_id_kind_fkey" FOREIGN KEY ("category_id", "kind") REFERENCES "public"."cash_flow_categories"("id", "kind") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payments_suppliers"
    ADD CONSTRAINT "payments_suppliers_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments_suppliers"
    ADD CONSTRAINT "payments_suppliers_category_id_kind_fkey" FOREIGN KEY ("category_id", "kind") REFERENCES "public"."cash_flow_categories"("id", "kind") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments_suppliers"
    ADD CONSTRAINT "payments_suppliers_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments_suppliers"
    ADD CONSTRAINT "payments_suppliers_purchase_supplier_id_fkey" FOREIGN KEY ("purchase_supplier_id") REFERENCES "public"."purchases_suppliers"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payments_suppliers"
    ADD CONSTRAINT "payments_suppliers_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "public"."works"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchases_suppliers"
    ADD CONSTRAINT "purchases_suppliers_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_supplies"
    ADD CONSTRAINT "supplies_category_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."gallery_supplies"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions_box"
    ADD CONSTRAINT "transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions_box"
    ADD CONSTRAINT "transactions_cash_box_id_fkey" FOREIGN KEY ("cash_box_id") REFERENCES "public"."cash_boxes"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_uid_user_fkey" FOREIGN KEY ("uid_user") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vacation_requests"
    ADD CONSTRAINT "vacation_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vacation_requests"
    ADD CONSTRAINT "vacation_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("uid_user") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."works"
    ADD CONSTRAINT "works_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Appointment blocked dates delete" ON "public"."appointment_blocked_dates" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Appointment blocked dates insert" ON "public"."appointment_blocked_dates" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Appointment blocked dates select" ON "public"."appointment_blocked_dates" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Appointment settings select" ON "public"."appointment_settings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Appointment settings update" ON "public"."appointment_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Appointments delete" ON "public"."appointments" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Appointments select" ON "public"."appointments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Appointments update" ON "public"."appointments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Attendance delete" ON "public"."attendance" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text")))));



CREATE POLICY "Attendance entries delete" ON "public"."attendance_entries" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text")))));



CREATE POLICY "Attendance entries insert" ON "public"."attendance_entries" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."attendance" "a"
  WHERE (("a"."id" = "attendance_entries"."attendance_id") AND (("a"."user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."users" "u"
          WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text")))))))));



CREATE POLICY "Attendance entries select" ON "public"."attendance_entries" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."attendance" "a"
  WHERE (("a"."id" = "attendance_entries"."attendance_id") AND (("a"."user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."users" "u"
          WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))))))));



CREATE POLICY "Attendance entries update" ON "public"."attendance_entries" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text")))));



CREATE POLICY "Attendance insert" ON "public"."attendance" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text"))))));



CREATE POLICY "Attendance select" ON "public"."attendance" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Attendance settings delete" ON "public"."attendance_settings" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Attendance settings insert" ON "public"."attendance_settings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Attendance settings select" ON "public"."attendance_settings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Attendance settings update" ON "public"."attendance_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Attendance update" ON "public"."attendance" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text")))));



CREATE POLICY "Budget signatures delete" ON "public"."budget_signatures" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Budget signatures insert" ON "public"."budget_signatures" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Budget signatures select" ON "public"."budget_signatures" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Budget signatures update" ON "public"."budget_signatures" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Budgets delete" ON "public"."budgets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Budgets insert" ON "public"."budgets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Budgets select" ON "public"."budgets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Budgets update" ON "public"."budgets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Channel members delete" ON "public"."channel_members" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Channel members insert" ON "public"."channel_members" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Channel members select" ON "public"."channel_members" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_channel_member"("channel_id", "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))));



CREATE POLICY "Channel members update" ON "public"."channel_members" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND (("u"."role")::"text" = 'Admin'::"text")))))) WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND (("u"."role")::"text" = 'Admin'::"text"))))));



CREATE POLICY "Channels delete" ON "public"."channels" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Channels insert" ON "public"."channels" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Channels select" ON "public"."channels" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."channel_members" "cm"
  WHERE (("cm"."channel_id" = "channels"."id") AND ("cm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))));



CREATE POLICY "Channels update" ON "public"."channels" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Checklists delete" ON "public"."checklists" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Checklists insert" ON "public"."checklists" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Checklists select" ON "public"."checklists" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Checklists update" ON "public"."checklists" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Clients delete" ON "public"."clients" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Clients insert" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Clients update" ON "public"."clients" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Employee documents delete" ON "public"."employee_documents" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Employee documents insert" ON "public"."employee_documents" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Employee documents select" ON "public"."employee_documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Employee documents update" ON "public"."employee_documents" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Employee evaluations delete" ON "public"."employee_evaluations" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Employee evaluations insert" ON "public"."employee_evaluations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Employee evaluations select" ON "public"."employee_evaluations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Employee evaluations update" ON "public"."employee_evaluations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Employees delete" ON "public"."employees" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Employees insert" ON "public"."employees" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Employees select" ON "public"."employees" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Employees update" ON "public"."employees" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Folder budgets delete" ON "public"."folder_budgets" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Folder budgets insert" ON "public"."folder_budgets" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Folder budgets select" ON "public"."folder_budgets" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Folder budgets update" ON "public"."folder_budgets" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Holiday work days delete" ON "public"."holiday_work_days" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Holiday work days insert" ON "public"."holiday_work_days" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Holiday work days select" ON "public"."holiday_work_days" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Holiday work days update" ON "public"."holiday_work_days" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Items checklists delete" ON "public"."items_checklists" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Items checklists insert" ON "public"."items_checklists" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Items checklists select" ON "public"."items_checklists" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Items checklists update" ON "public"."items_checklists" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Items predefined delete" ON "public"."items_predefined" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Items predefined insert" ON "public"."items_predefined" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Items predefined select" ON "public"."items_predefined" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Items predefined update" ON "public"."items_predefined" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Materials delete" ON "public"."materials" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Materials insert" ON "public"."materials" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Materials select" ON "public"."materials" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Materials update" ON "public"."materials" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Messages delete" ON "public"."messages" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Messages insert" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((((EXISTS ( SELECT 1
   FROM "public"."channel_members" "cm"
  WHERE (("cm"."channel_id" = "messages"."channel_id") AND ("cm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND (("u"."role")::"text" = 'Admin'::"text"))))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Messages select" ON "public"."messages" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."channel_members" "cm"
  WHERE (("cm"."channel_id" = "cm"."channel_id") AND ("cm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))));



CREATE POLICY "Messages update" ON "public"."messages" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Modules delete" ON "public"."modules" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Modules insert" ON "public"."modules" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Modules monthly settlements delete" ON "public"."modules_monthly_settlements" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Modules monthly settlements insert" ON "public"."modules_monthly_settlements" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Modules monthly settlements select" ON "public"."modules_monthly_settlements" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Modules monthly settlements update" ON "public"."modules_monthly_settlements" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Modules select" ON "public"."modules" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Modules settings delete" ON "public"."modules_settings" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Modules settings insert" ON "public"."modules_settings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Modules settings select" ON "public"."modules_settings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Modules settings update" ON "public"."modules_settings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Modules update" ON "public"."modules" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Modules_files delete" ON "public"."modules_files" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."modules" "m"
  WHERE (("m"."id" = "modules_files"."module_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Modules_files insert" ON "public"."modules_files" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."modules" "m"
  WHERE (("m"."id" = "modules_files"."module_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Modules_files select" ON "public"."modules_files" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."modules" "m"
  WHERE (("m"."id" = "modules_files"."module_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Modules_files update" ON "public"."modules_files" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))) OR (EXISTS ( SELECT 1
   FROM "public"."modules" "m"
  WHERE (("m"."id" = "modules_files"."module_id") AND ("m"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Monthly settlements delete" ON "public"."monthly_settlements" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text")))));



CREATE POLICY "Monthly settlements insert" ON "public"."monthly_settlements" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text")))));



CREATE POLICY "Monthly settlements select" ON "public"."monthly_settlements" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text")))) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Monthly settlements update" ON "public"."monthly_settlements" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_superadmin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete balance_transactions" ON "public"."balance_transactions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete balances" ON "public"."balances" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete bank_accounts" ON "public"."bank_accounts" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete cash_boxes" ON "public"."cash_boxes" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete cash_flow_categories" ON "public"."cash_flow_categories" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete claims" ON "public"."claims" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Public delete collections" ON "public"."collections" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete events" ON "public"."events" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete events_types" ON "public"."events_types" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete expenses" ON "public"."expenses" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete files_client" ON "public"."files_client" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete files_payments_suppliers" ON "public"."files_payments_suppliers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete files_purchases_suppliers" ON "public"."files_purchases_suppliers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete fixed_expense_payments" ON "public"."fixed_expense_payments" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete fixed_expenses" ON "public"."fixed_expenses" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete gallery_checklists" ON "public"."gallery_checklists" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Public delete gallery_supplies" ON "public"."gallery_supplies" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Public delete incomes" ON "public"."incomes" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete payment_methods" ON "public"."payment_methods" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete payments" ON "public"."payments" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete payments_suppliers" ON "public"."payments_suppliers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete purchases_suppliers" ON "public"."purchases_suppliers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete push_subscriptions" ON "public"."push_subscriptions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Public delete stock_supplies" ON "public"."stock_supplies" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Public delete suppliers" ON "public"."suppliers" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete transactions_box" ON "public"."transactions_box" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete users" ON "public"."users" FOR DELETE TO "service_role" USING (true);



CREATE POLICY "Public delete voucher_types" ON "public"."voucher_types" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public delete works" ON "public"."works" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert balance_transactions" ON "public"."balance_transactions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert balances" ON "public"."balances" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert bank_accounts" ON "public"."bank_accounts" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert cash_boxes" ON "public"."cash_boxes" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert cash_flow_categories" ON "public"."cash_flow_categories" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert claims" ON "public"."claims" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Public insert collections" ON "public"."collections" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert events" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert events_types" ON "public"."events_types" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert expenses" ON "public"."expenses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert files_client" ON "public"."files_client" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Public insert files_payments_suppliers" ON "public"."files_payments_suppliers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert files_purchases_suppliers" ON "public"."files_purchases_suppliers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert fixed_expense_payments" ON "public"."fixed_expense_payments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert fixed_expenses" ON "public"."fixed_expenses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert gallery_checklists" ON "public"."gallery_checklists" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Public insert gallery_supplies" ON "public"."gallery_supplies" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Public insert incomes" ON "public"."incomes" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert payment_methods" ON "public"."payment_methods" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert payments" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert payments_suppliers" ON "public"."payments_suppliers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert purchases_suppliers" ON "public"."purchases_suppliers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert push_subscriptions" ON "public"."push_subscriptions" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Public insert stock_supplies" ON "public"."stock_supplies" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Public insert suppliers" ON "public"."suppliers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert transactions_box" ON "public"."transactions_box" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert users" ON "public"."users" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Public insert voucher_types" ON "public"."voucher_types" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public insert works" ON "public"."works" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select balance_transactions" ON "public"."balance_transactions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select balances" ON "public"."balances" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select bank_accounts" ON "public"."bank_accounts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select cash_boxes" ON "public"."cash_boxes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select cash_flow_categories" ON "public"."cash_flow_categories" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select claims" ON "public"."claims" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public select clients" ON "public"."clients" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public select collections" ON "public"."collections" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select events" ON "public"."events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public select expenses" ON "public"."expenses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select files_client" ON "public"."files_client" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public select files_payments_suppliers" ON "public"."files_payments_suppliers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select files_purchases_suppliers" ON "public"."files_purchases_suppliers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select fixed_expense_payments" ON "public"."fixed_expense_payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select fixed_expenses" ON "public"."fixed_expenses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select gallery_checklists" ON "public"."gallery_checklists" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public select gallery_supplies" ON "public"."gallery_supplies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public select incomes" ON "public"."incomes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select payment_methods" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select payments" ON "public"."payments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select payments_suppliers" ON "public"."payments_suppliers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select purchases_suppliers" ON "public"."purchases_suppliers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select push_subscriptions" ON "public"."push_subscriptions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public select stock_supplies" ON "public"."stock_supplies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public select suppliers" ON "public"."suppliers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select transactions_box" ON "public"."transactions_box" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select voucher_types" ON "public"."voucher_types" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public select works" ON "public"."works" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public update balance_transactions" ON "public"."balance_transactions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update balances" ON "public"."balances" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update bank_accounts" ON "public"."bank_accounts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update cash_boxes" ON "public"."cash_boxes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update cash_flow_categories" ON "public"."cash_flow_categories" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update claims" ON "public"."claims" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Public update collections" ON "public"."collections" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update events" ON "public"."events" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update events_types" ON "public"."events_types" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update expenses" ON "public"."expenses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update files_client" ON "public"."files_client" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Public update files_payments_suppliers" ON "public"."files_payments_suppliers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update files_purchases_suppliers" ON "public"."files_purchases_suppliers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update fixed_expense_payments" ON "public"."fixed_expense_payments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update fixed_expenses" ON "public"."fixed_expenses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update gallery_checklists" ON "public"."gallery_checklists" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Public update incomes" ON "public"."incomes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update payment_methods" ON "public"."payment_methods" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update payments" ON "public"."payments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update payments_suppliers" ON "public"."payments_suppliers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update purchases_suppliers" ON "public"."purchases_suppliers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update push_subscriptions" ON "public"."push_subscriptions" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Public update stock_supplies" ON "public"."stock_supplies" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Public update suppliers" ON "public"."suppliers" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update transactions_box" ON "public"."transactions_box" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update users" ON "public"."users" FOR UPDATE TO "service_role" USING (true);



CREATE POLICY "Public update voucher_types" ON "public"."voucher_types" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Public update works" ON "public"."works" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "Transactions box delete" ON "public"."transactions_box" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND (("u"."role")::"text" = 'Admin'::"text")))));



CREATE POLICY "Transactions box insert" ON "public"."transactions_box" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND (("u"."role")::"text" = 'Admin'::"text")))));



CREATE POLICY "Transactions box select" ON "public"."transactions_box" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND (("u"."role")::"text" = 'Admin'::"text")))));



CREATE POLICY "Transactions box update" ON "public"."transactions_box" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND (("u"."role")::"text" = 'Admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND (("u"."role")::"text" = 'Admin'::"text")))));



CREATE POLICY "Users read own record" ON "public"."users" FOR SELECT TO "authenticated" USING (("uid_user" = "auth"."uid"()));



CREATE POLICY "Vacation requests delete" ON "public"."vacation_requests" FOR DELETE TO "authenticated" USING (((("user_id" = "auth"."uid"()) AND ("status" = 'Pendiente'::"text")) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))));



CREATE POLICY "Vacation requests insert" ON "public"."vacation_requests" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND ("status" = 'Pendiente'::"text")));



CREATE POLICY "Vacation requests select" ON "public"."vacation_requests" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))));



CREATE POLICY "Vacation requests update" ON "public"."vacation_requests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "allow_delete_events_types" ON "public"."events_types" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND (("u"."role")::"text" = 'Admin'::"text")))));



CREATE POLICY "allow_insert_events_types" ON "public"."events_types" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND (("u"."role")::"text" = 'Admin'::"text")))));



CREATE POLICY "allow_select_events_types" ON "public"."events_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_select_users" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_update_events_types" ON "public"."events_types" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND (("u"."role")::"text" = 'Admin'::"text")))));



ALTER TABLE "public"."appointment_blocked_dates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointment_blocked_dates select by view" ON "public"."appointment_blocked_dates" FOR SELECT TO "authenticated" USING ("public"."can_view"('calendar.appointments'::"text"));



ALTER TABLE "public"."appointment_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointment_settings select by view" ON "public"."appointment_settings" FOR SELECT TO "authenticated" USING ("public"."can_view"('calendar.appointments'::"text"));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointments select by view" ON "public"."appointments" FOR SELECT TO "authenticated" USING ("public"."can_view"('calendar.appointments'::"text"));



ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."balance_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "balance_transactions select by view" ON "public"."balance_transactions" FOR SELECT TO "authenticated" USING (("public"."can_view"('clients.balances'::"text") OR "public"."can_view"('cash-flow'::"text")));



ALTER TABLE "public"."balances" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "balances select by view" ON "public"."balances" FOR SELECT TO "authenticated" USING (("public"."can_view"('clients.balances'::"text") OR "public"."can_view"('reports'::"text") OR "public"."can_view"('cash-flow'::"text")));



ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bank_accounts select by view" ON "public"."bank_accounts" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."budget_signatures" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budget_signatures select by view" ON "public"."budget_signatures" FOR SELECT TO "authenticated" USING ("public"."can_view"('clients.budgets'::"text"));



ALTER TABLE "public"."budgets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "budgets select by view" ON "public"."budgets" FOR SELECT TO "authenticated" USING (("public"."can_view"('clients.budgets'::"text") OR "public"."can_view"('reports'::"text") OR "public"."can_view"('cash-flow'::"text")));



ALTER TABLE "public"."cash_boxes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_boxes select by view" ON "public"."cash_boxes" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."cash_flow_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cash_flow_categories select by view" ON "public"."cash_flow_categories" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."channel_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."channels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "collections select by view" ON "public"."collections" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."employee_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_documents select by view" ON "public"."employee_documents" FOR SELECT TO "authenticated" USING ("public"."can_view"('employees.fichas'::"text"));



ALTER TABLE "public"."employee_evaluations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_evaluations select by view" ON "public"."employee_evaluations" FOR SELECT TO "authenticated" USING ("public"."can_view"('employees.evaluaciones'::"text"));



ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employees select by view" ON "public"."employees" FOR SELECT TO "authenticated" USING (("public"."can_view"('employees.fichas'::"text") OR "public"."can_view"('employees.evaluaciones'::"text")));



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "expenses select by view" ON "public"."expenses" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."files_client" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."files_payments_suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "files_payments_suppliers select by view" ON "public"."files_payments_suppliers" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."files_purchases_suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "files_purchases_suppliers select by view" ON "public"."files_purchases_suppliers" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."fixed_expense_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fixed_expense_payments select by view" ON "public"."fixed_expense_payments" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."fixed_expenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "fixed_expenses select by view" ON "public"."fixed_expenses" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."folder_budgets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "folder_budgets select by view" ON "public"."folder_budgets" FOR SELECT TO "authenticated" USING (("public"."can_view"('clients.budgets'::"text") OR "public"."can_view"('reports'::"text") OR "public"."can_view"('cash-flow'::"text")));



ALTER TABLE "public"."gallery_checklists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gallery_supplies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."holiday_work_days" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."incomes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "incomes select by view" ON "public"."incomes" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."items_checklists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."items_predefined" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kanban_board_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kanban_board_members delete" ON "public"."kanban_board_members" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "kanban_board_members insert" ON "public"."kanban_board_members" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "kanban_board_members select" ON "public"."kanban_board_members" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))));



CREATE POLICY "kanban_board_members update" ON "public"."kanban_board_members" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



ALTER TABLE "public"."kanban_boards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kanban_boards delete" ON "public"."kanban_boards" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "kanban_boards insert" ON "public"."kanban_boards" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "kanban_boards select" ON "public"."kanban_boards" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."kanban_board_members" "kbm"
  WHERE (("kbm"."board_id" = "kanban_boards"."id") AND ("kbm"."user_id" = "auth"."uid"())))));



CREATE POLICY "kanban_boards update" ON "public"."kanban_boards" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



ALTER TABLE "public"."kanban_cards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kanban_cards delete" ON "public"."kanban_cards" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "kanban_cards insert" ON "public"."kanban_cards" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "kanban_cards select" ON "public"."kanban_cards" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."kanban_board_members" "kbm"
     JOIN "public"."kanban_lists" "kl" ON (("kl"."board_id" = "kbm"."board_id")))
  WHERE (("kl"."id" = "kanban_cards"."list_id") AND ("kbm"."user_id" = "auth"."uid"())))));



CREATE POLICY "kanban_cards update" ON "public"."kanban_cards" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."kanban_board_members" "kbm"
     JOIN "public"."kanban_lists" "kl" ON (("kl"."board_id" = "kbm"."board_id")))
  WHERE (("kl"."id" = "kanban_cards"."list_id") AND ("kbm"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."kanban_board_members" "kbm"
     JOIN "public"."kanban_lists" "kl" ON (("kl"."board_id" = "kbm"."board_id")))
  WHERE (("kl"."id" = "kanban_cards"."list_id") AND ("kbm"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."kanban_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kanban_files delete" ON "public"."kanban_files" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "kanban_files insert" ON "public"."kanban_files" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "kanban_files select" ON "public"."kanban_files" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."kanban_cards" "kc"
     JOIN "public"."kanban_lists" "kl" ON (("kl"."id" = "kc"."list_id")))
     JOIN "public"."kanban_board_members" "kbm" ON (("kbm"."board_id" = "kl"."board_id")))
  WHERE (("kc"."id" = "kanban_files"."kanban_card_id") AND ("kbm"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."kanban_lists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kanban_lists delete" ON "public"."kanban_lists" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "kanban_lists insert" ON "public"."kanban_lists" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."uid_user" = "auth"."uid"()) AND "public"."is_admin_role"(("u"."role")::"text")))));



CREATE POLICY "kanban_lists select" ON "public"."kanban_lists" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."kanban_board_members" "kbm"
  WHERE (("kbm"."board_id" = "kanban_lists"."board_id") AND ("kbm"."user_id" = "auth"."uid"())))));



CREATE POLICY "kanban_lists update" ON "public"."kanban_lists" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."modules_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."modules_monthly_settlements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."modules_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monthly_settlements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_methods select by view" ON "public"."payment_methods" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments select by view" ON "public"."payments" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."payments_suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_suppliers select by view" ON "public"."payments_suppliers" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."purchases_suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "purchases_suppliers select by view" ON "public"."purchases_suppliers" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stock_supplies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "suppliers select by view" ON "public"."suppliers" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."transactions_box" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transactions_box select by view" ON "public"."transactions_box" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vacation_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voucher_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "voucher_types select by view" ON "public"."voucher_types" FOR SELECT TO "authenticated" USING ("public"."can_view"('cash-flow'::"text"));



ALTER TABLE "public"."works" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."appointment_blocked_dates";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."appointment_settings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."appointments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."attendance";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."attendance_entries";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."attendance_settings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."balance_transactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."balances";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."bank_accounts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."budget_signatures";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."budgets";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."cash_boxes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."channel_members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."channels";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."checklists";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."claims";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."clients";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."employee_documents";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."employee_evaluations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."employees";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."events_types";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."files_client";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."folder_budgets";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."gallery_checklists";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."items_checklists";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."items_predefined";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."kanban_board_members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."kanban_boards";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."kanban_cards";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."kanban_files";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."kanban_lists";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."materials";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."modules";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."modules_files";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."modules_settings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."payment_methods";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."payments_suppliers";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."purchases_suppliers";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."push_subscriptions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."stock_supplies";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."transactions_box";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."users";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."vacation_requests";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."works";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."can_view"("view_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."can_view"("view_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view"("view_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cash_flow_fixed_costs_monthly"("p_year" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cash_flow_fixed_costs_monthly"("p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cash_flow_fixed_costs_monthly"("p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cash_flow_fixed_costs_monthly"("p_year" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cash_flow_movement_totals"("p_group_by" "text", "p_start" "date", "p_end" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cash_flow_movement_totals"("p_group_by" "text", "p_start" "date", "p_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."cash_flow_movement_totals"("p_group_by" "text", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cash_flow_movement_totals"("p_group_by" "text", "p_start" "date", "p_end" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cash_flow_summary_monthly"("p_year" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cash_flow_summary_monthly"("p_year" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cash_flow_summary_monthly"("p_year" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cash_flow_summary_monthly"("p_year" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_expired_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_expired_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_expired_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."close_open_cash_box"() TO "anon";
GRANT ALL ON FUNCTION "public"."close_open_cash_box"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_open_cash_box"() TO "service_role";



GRANT ALL ON FUNCTION "public"."close_pending_attendance_entries"() TO "anon";
GRANT ALL ON FUNCTION "public"."close_pending_attendance_entries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."close_pending_attendance_entries"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_audit_log"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_audit_log"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_audit_log"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_board_with_member"("p_name" "text", "p_description" "text", "p_color" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."create_board_with_member"("p_name" "text", "p_description" "text", "p_color" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_board_with_member"("p_name" "text", "p_description" "text", "p_color" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_fixed_expense_payment"("p_payment_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_fixed_expense_payment"("p_payment_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_fixed_expense_payment"("p_payment_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."delete_payment_supplier"("p_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_payment_supplier"("p_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_payment_supplier"("p_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_payment_supplier"("p_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_purchase_supplier"("p_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_purchase_supplier"("p_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_purchase_supplier"("p_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_purchase_supplier"("p_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."expenses_compute_iva_and_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."expenses_compute_iva_and_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."expenses_compute_iva_and_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_invoice_number"("p_company_id" "uuid", "p_point_of_sale" integer, "p_invoice_type" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_invoice_number"("p_company_id" "uuid", "p_point_of_sale" integer, "p_invoice_type" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_invoice_number"("p_company_id" "uuid", "p_point_of_sale" integer, "p_invoice_type" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_supplier_account_totals"("p_supplier_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_supplier_account_totals"("p_supplier_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_supplier_account_totals"("p_supplier_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_supplier_account_totals"("p_supplier_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_suppliers_accounts_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_suppliers_accounts_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_suppliers_accounts_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_counts_by_channel"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_counts_by_channel"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_counts_by_channel"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_messages_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_messages_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_messages_count"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."incomes_compute_iva_and_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."incomes_compute_iva_and_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."incomes_compute_iva_and_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_role"("role_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_role"("role_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_role"("role_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_channel_member"("channel_id" bigint, "user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_channel_member"("channel_id" bigint, "user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_channel_member"("channel_id" bigint, "user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_superadmin_role"("role_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_superadmin_role"("role_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_superadmin_role"("role_value" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_supplier_purchases"("p_supplier_id" bigint, "p_status" "text", "p_from" "date", "p_to" "date", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_supplier_purchases"("p_supplier_id" bigint, "p_status" "text", "p_from" "date", "p_to" "date", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."list_supplier_purchases"("p_supplier_id" bigint, "p_status" "text", "p_from" "date", "p_to" "date", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_supplier_purchases"("p_supplier_id" bigint, "p_status" "text", "p_from" "date", "p_to" "date", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON TABLE "public"."fixed_expense_payments" TO "anon";
GRANT ALL ON TABLE "public"."fixed_expense_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."fixed_expense_payments" TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_fixed_expense_paid"("p_fixed_expense_id" bigint, "p_paid_date" "date", "p_period" "date", "p_net_amount" numeric, "p_iva_percent" numeric, "p_payment_method_id" bigint, "p_bank_account_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_fixed_expense_paid"("p_fixed_expense_id" bigint, "p_paid_date" "date", "p_period" "date", "p_net_amount" numeric, "p_iva_percent" numeric, "p_payment_method_id" bigint, "p_bank_account_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."mark_fixed_expense_paid"("p_fixed_expense_id" bigint, "p_paid_date" "date", "p_period" "date", "p_net_amount" numeric, "p_iva_percent" numeric, "p_payment_method_id" bigint, "p_bank_account_id" bigint) TO "authenticated";



GRANT ALL ON FUNCTION "public"."modules_files_guard_review_columns"() TO "anon";
GRANT ALL ON FUNCTION "public"."modules_files_guard_review_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."modules_files_guard_review_columns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."modules_guard_review_columns"() TO "anon";
GRANT ALL ON FUNCTION "public"."modules_guard_review_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."modules_guard_review_columns"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_fixed_expenses_paid"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_fixed_expenses_paid"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_appointments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_appointments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_appointments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_budget_signatures_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_budget_signatures_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_budget_signatures_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_employee_evaluations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_employee_evaluations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_employee_evaluations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_last_read_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_last_read_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_last_read_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_vacation_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_vacation_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_vacation_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_balance_transaction_to_cash_box"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_balance_transaction_to_cash_box"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_balance_transaction_to_cash_box"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."unmark_fixed_expense_paid"("p_fixed_expense_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."unmark_fixed_expense_paid"("p_fixed_expense_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."unmark_fixed_expense_paid"("p_fixed_expense_id" bigint) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."update_fixed_expense_payment"("p_payment_id" bigint, "p_paid_date" "date", "p_period" "date", "p_net_amount" numeric, "p_iva_percent" numeric, "p_payment_method_id" bigint, "p_bank_account_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_fixed_expense_payment"("p_payment_id" bigint, "p_paid_date" "date", "p_period" "date", "p_net_amount" numeric, "p_iva_percent" numeric, "p_payment_method_id" bigint, "p_bank_account_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."update_fixed_expense_payment"("p_payment_id" bigint, "p_paid_date" "date", "p_period" "date", "p_net_amount" numeric, "p_iva_percent" numeric, "p_payment_method_id" bigint, "p_bank_account_id" bigint) TO "authenticated";



GRANT ALL ON FUNCTION "public"."update_push_subscriptions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_push_subscriptions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_push_subscriptions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_cuit"("p_cuit" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_cuit"("p_cuit" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_cuit"("p_cuit" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";
























GRANT ALL ON TABLE "public"."appointment_blocked_dates" TO "anon";
GRANT ALL ON TABLE "public"."appointment_blocked_dates" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_blocked_dates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."appointment_blocked_dates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."appointment_blocked_dates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."appointment_blocked_dates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."appointment_settings" TO "anon";
GRANT ALL ON TABLE "public"."appointment_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."appointment_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."appointment_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."appointment_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."appointment_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."appointments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."appointments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."appointments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."attendance" TO "anon";
GRANT ALL ON TABLE "public"."attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_entries" TO "anon";
GRANT ALL ON TABLE "public"."attendance_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_entries" TO "service_role";



GRANT ALL ON SEQUENCE "public"."attendance_entries_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."attendance_entries_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."attendance_entries_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."attendance_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."attendance_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."attendance_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_settings" TO "anon";
GRANT ALL ON TABLE "public"."attendance_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."attendance_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."attendance_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."attendance_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."balance_transactions" TO "anon";
GRANT ALL ON TABLE "public"."balance_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."balance_transactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."balance_transactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."balance_transactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."balance_transactions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."balances" TO "anon";
GRANT ALL ON TABLE "public"."balances" TO "authenticated";
GRANT ALL ON TABLE "public"."balances" TO "service_role";



GRANT ALL ON SEQUENCE "public"."balances_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."balances_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."balances_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."bank_accounts" TO "anon";
GRANT ALL ON TABLE "public"."bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_accounts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."bank_accounts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bank_accounts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bank_accounts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."budget_signatures" TO "anon";
GRANT ALL ON TABLE "public"."budget_signatures" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_signatures" TO "service_role";



GRANT ALL ON SEQUENCE "public"."budget_signatures_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."budget_signatures_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."budget_signatures_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."budgets" TO "anon";
GRANT ALL ON TABLE "public"."budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."budgets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."budgets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."budgets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."budgets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cash_boxes" TO "anon";
GRANT ALL ON TABLE "public"."cash_boxes" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_boxes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cash_boxes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cash_boxes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cash_boxes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cash_flow_categories" TO "anon";
GRANT ALL ON TABLE "public"."cash_flow_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_flow_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cash_flow_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cash_flow_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cash_flow_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."channel_members" TO "anon";
GRANT ALL ON TABLE "public"."channel_members" TO "authenticated";
GRANT ALL ON TABLE "public"."channel_members" TO "service_role";



GRANT ALL ON SEQUENCE "public"."channel_members_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."channel_members_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."channel_members_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."channels" TO "anon";
GRANT ALL ON TABLE "public"."channels" TO "authenticated";
GRANT ALL ON TABLE "public"."channels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."channels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."channels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."channels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."checklists" TO "anon";
GRANT ALL ON TABLE "public"."checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."checklists" TO "service_role";



GRANT ALL ON SEQUENCE "public"."checklists_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."checklists_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."checklists_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."claims" TO "anon";
GRANT ALL ON TABLE "public"."claims" TO "authenticated";
GRANT ALL ON TABLE "public"."claims" TO "service_role";



GRANT ALL ON SEQUENCE "public"."claims_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."claims_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."claims_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."collections" TO "anon";
GRANT ALL ON TABLE "public"."collections" TO "authenticated";
GRANT ALL ON TABLE "public"."collections" TO "service_role";



GRANT ALL ON SEQUENCE "public"."collections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."collections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."collections_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."employee_documents" TO "anon";
GRANT ALL ON TABLE "public"."employee_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_documents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."employee_documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."employee_documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."employee_documents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."employee_evaluations" TO "anon";
GRANT ALL ON TABLE "public"."employee_evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_evaluations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."employee_evaluations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."employee_evaluations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."employee_evaluations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON SEQUENCE "public"."employees_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."employees_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."employees_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."events_types" TO "anon";
GRANT ALL ON TABLE "public"."events_types" TO "authenticated";
GRANT ALL ON TABLE "public"."events_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."events_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_types_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."expenses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."expenses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."expenses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."files_client" TO "anon";
GRANT ALL ON TABLE "public"."files_client" TO "authenticated";
GRANT ALL ON TABLE "public"."files_client" TO "service_role";



GRANT ALL ON SEQUENCE "public"."files_client_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."files_client_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."files_client_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."files_payments_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."files_payments_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."files_payments_suppliers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."files_payments_suppliers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."files_payments_suppliers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."files_payments_suppliers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."files_purchases_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."files_purchases_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."files_purchases_suppliers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."files_purchases_suppliers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."files_purchases_suppliers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."files_purchases_suppliers_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fixed_expense_payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fixed_expense_payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fixed_expense_payments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."fixed_expenses" TO "anon";
GRANT ALL ON TABLE "public"."fixed_expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."fixed_expenses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fixed_expenses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fixed_expenses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fixed_expenses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."folder_budgets" TO "anon";
GRANT ALL ON TABLE "public"."folder_budgets" TO "authenticated";
GRANT ALL ON TABLE "public"."folder_budgets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."folder_budgets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."folder_budgets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."folder_budgets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."gallery_checklists" TO "anon";
GRANT ALL ON TABLE "public"."gallery_checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."gallery_checklists" TO "service_role";



GRANT ALL ON TABLE "public"."gallery_supplies" TO "anon";
GRANT ALL ON TABLE "public"."gallery_supplies" TO "authenticated";
GRANT ALL ON TABLE "public"."gallery_supplies" TO "service_role";



GRANT ALL ON SEQUENCE "public"."gallery_supplies_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."gallery_supplies_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."gallery_supplies_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."holiday_work_days" TO "anon";
GRANT ALL ON TABLE "public"."holiday_work_days" TO "authenticated";
GRANT ALL ON TABLE "public"."holiday_work_days" TO "service_role";



GRANT ALL ON SEQUENCE "public"."holiday_work_days_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."holiday_work_days_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."holiday_work_days_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."images_checklists_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."images_checklists_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."images_checklists_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."incomes" TO "anon";
GRANT ALL ON TABLE "public"."incomes" TO "authenticated";
GRANT ALL ON TABLE "public"."incomes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."incomes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."incomes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."incomes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."items_checklists" TO "anon";
GRANT ALL ON TABLE "public"."items_checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."items_checklists" TO "service_role";



GRANT ALL ON SEQUENCE "public"."items_checklists_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."items_checklists_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."items_checklists_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."items_predefined" TO "anon";
GRANT ALL ON TABLE "public"."items_predefined" TO "authenticated";
GRANT ALL ON TABLE "public"."items_predefined" TO "service_role";



GRANT ALL ON SEQUENCE "public"."items_predefined_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."items_predefined_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."items_predefined_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."kanban_board_members" TO "anon";
GRANT ALL ON TABLE "public"."kanban_board_members" TO "authenticated";
GRANT ALL ON TABLE "public"."kanban_board_members" TO "service_role";



GRANT ALL ON SEQUENCE "public"."kanban_board_members_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."kanban_board_members_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."kanban_board_members_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."kanban_boards" TO "anon";
GRANT ALL ON TABLE "public"."kanban_boards" TO "authenticated";
GRANT ALL ON TABLE "public"."kanban_boards" TO "service_role";



GRANT ALL ON SEQUENCE "public"."kanban_boards_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."kanban_boards_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."kanban_boards_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."kanban_cards" TO "anon";
GRANT ALL ON TABLE "public"."kanban_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."kanban_cards" TO "service_role";



GRANT ALL ON SEQUENCE "public"."kanban_cards_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."kanban_cards_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."kanban_cards_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."kanban_files" TO "anon";
GRANT ALL ON TABLE "public"."kanban_files" TO "authenticated";
GRANT ALL ON TABLE "public"."kanban_files" TO "service_role";



GRANT ALL ON SEQUENCE "public"."kanban_files_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."kanban_files_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."kanban_files_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."kanban_lists" TO "anon";
GRANT ALL ON TABLE "public"."kanban_lists" TO "authenticated";
GRANT ALL ON TABLE "public"."kanban_lists" TO "service_role";



GRANT ALL ON SEQUENCE "public"."kanban_lists_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."kanban_lists_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."kanban_lists_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."materials" TO "anon";
GRANT ALL ON TABLE "public"."materials" TO "authenticated";
GRANT ALL ON TABLE "public"."materials" TO "service_role";



GRANT ALL ON SEQUENCE "public"."materials_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."materials_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."materials_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."messages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT ALL ON TABLE "public"."modules" TO "service_role";



GRANT ALL ON TABLE "public"."modules_files" TO "anon";
GRANT ALL ON TABLE "public"."modules_files" TO "authenticated";
GRANT ALL ON TABLE "public"."modules_files" TO "service_role";



GRANT ALL ON SEQUENCE "public"."modules_files_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."modules_files_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."modules_files_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."modules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."modules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."modules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."modules_monthly_settlements" TO "anon";
GRANT ALL ON TABLE "public"."modules_monthly_settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."modules_monthly_settlements" TO "service_role";



GRANT ALL ON SEQUENCE "public"."modules_monthly_settlements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."modules_monthly_settlements_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."modules_monthly_settlements_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."modules_settings" TO "anon";
GRANT ALL ON TABLE "public"."modules_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."modules_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."modules_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."modules_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."modules_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_settlements" TO "anon";
GRANT ALL ON TABLE "public"."monthly_settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_settlements" TO "service_role";



GRANT ALL ON SEQUENCE "public"."monthly_settlements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."monthly_settlements_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."monthly_settlements_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payment_methods_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payment_methods_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payment_methods_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payments_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."payments_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."payments_suppliers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payments_suppliers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payments_suppliers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payments_suppliers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchases_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."purchases_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases_suppliers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchases_suppliers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchases_suppliers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchases_suppliers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."push_subscriptions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."push_subscriptions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."push_subscriptions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."stock_supplies" TO "anon";
GRANT ALL ON TABLE "public"."stock_supplies" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_supplies" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."supplies_category_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."supplies_category_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."supplies_category_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."transactions_box" TO "anon";
GRANT ALL ON TABLE "public"."transactions_box" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions_box" TO "service_role";



GRANT ALL ON SEQUENCE "public"."transactions_box_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."transactions_box_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."transactions_box_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vacation_requests" TO "anon";
GRANT ALL ON TABLE "public"."vacation_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."vacation_requests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vacation_requests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."vacation_requests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vacation_requests_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."voucher_types" TO "anon";
GRANT ALL ON TABLE "public"."voucher_types" TO "authenticated";
GRANT ALL ON TABLE "public"."voucher_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."voucher_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."voucher_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."voucher_types_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."works" TO "anon";
GRANT ALL ON TABLE "public"."works" TO "authenticated";
GRANT ALL ON TABLE "public"."works" TO "service_role";



GRANT ALL ON SEQUENCE "public"."works_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."works_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."works_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































