CREATE OR REPLACE FUNCTION prevent_media_asset_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'media assets are append-only'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER media_assets_append_only
BEFORE UPDATE OR DELETE ON media_assets
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_media_asset_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_media_derivative_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'media derivatives are append-only'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER media_derivatives_append_only
BEFORE UPDATE OR DELETE ON media_derivatives
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_media_derivative_mutation();
