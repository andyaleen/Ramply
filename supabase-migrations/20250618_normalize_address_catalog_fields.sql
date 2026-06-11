-- Consolidate legacy address catalog keys into a single `address` field on share requests and templates.

CREATE OR REPLACE FUNCTION normalize_address_field_selection(fields TEXT[])
RETURNS TEXT[] AS $$
DECLARE
  result TEXT[] := '{}';
  field_key TEXT;
  include_address BOOLEAN := FALSE;
  legacy_address_keys TEXT[] := ARRAY[
    'address_line1',
    'address_line2',
    'city',
    'state',
    'postal_code',
    'country'
  ];
BEGIN
  IF fields IS NULL THEN
    RETURN result;
  END IF;

  FOREACH field_key IN ARRAY fields
  LOOP
    IF field_key = 'address' THEN
      include_address := TRUE;
    ELSIF field_key = ANY(legacy_address_keys) THEN
      include_address := TRUE;
    ELSE
      result := array_append(result, field_key);
    END IF;
  END LOOP;

  IF include_address THEN
    result := array_append(result, 'address');
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE share_requests
SET mandatory_fields = normalize_address_field_selection(mandatory_fields),
    optional_fields = normalize_address_field_selection(optional_fields)
WHERE mandatory_fields && ARRAY[
      'address_line1',
      'address_line2',
      'city',
      'state',
      'postal_code',
      'country',
      'address'
    ]::TEXT[]
   OR optional_fields && ARRAY[
      'address_line1',
      'address_line2',
      'city',
      'state',
      'postal_code',
      'country',
      'address'
    ]::TEXT[];

UPDATE request_templates
SET mandatory_fields = normalize_address_field_selection(mandatory_fields),
    optional_fields = normalize_address_field_selection(optional_fields)
WHERE mandatory_fields && ARRAY[
      'address_line1',
      'address_line2',
      'city',
      'state',
      'postal_code',
      'country',
      'address'
    ]::TEXT[]
   OR optional_fields && ARRAY[
      'address_line1',
      'address_line2',
      'city',
      'state',
      'postal_code',
      'country',
      'address'
    ]::TEXT[];

DROP FUNCTION normalize_address_field_selection(TEXT[]);
