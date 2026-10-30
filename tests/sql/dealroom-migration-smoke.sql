-- Run after foundation and signature migrations in disposable CI PostgreSQL.
BEGIN;
INSERT INTO users(id) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

INSERT INTO dealroom_sessions(session_token_hash,role,kind,principal_id,name,expires_at)
VALUES (repeat('a',64),'buyer','authenticated','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','CI Buyer',now()+interval '1 day');

INSERT INTO dealroom_envelopes(
  envelope_id,listing_id,buyer_session_hash,buyer_principal_id,buyer_name,status,
  provider,signer_email,provider_test_mode,provider_request_id
) VALUES (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','MNA-2047',repeat('a',64),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','CI Buyer','signed',
  'DropboxSign','buyer@example.invalid',true,'provider-ci-check-123'
);

INSERT INTO dealroom_grants(
  grant_id,listing_id,buyer_session_hash,buyer_principal_id,buyer_name,envelope_id
) VALUES (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc','MNA-2047',repeat('a',64),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','CI Buyer','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);

INSERT INTO dealroom_provider_events(id,provider_request_id,event_type,event_time,event_hash)
VALUES (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd','provider-ci-check-123',
  'signature_request_all_signed',1793394000,repeat('e',64)
);


INSERT INTO dealroom_documents(id,listing_id,title,created_by)
VALUES('ffffffff-ffff-4fff-8fff-ffffffffffff','MNA-2047','Synthetic document','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO dealroom_document_versions(
  id,document_id,version,filename,original_length,sha256,iv,auth_tag,ciphertext,uploaded_by
) VALUES (
  '99999999-9999-4999-8999-999999999999','ffffffff-ffff-4fff-8fff-ffffffffffff',
  1,'synthetic.pdf',10,repeat('f',64),decode(repeat('aa',12),'hex'),
  decode(repeat('bb',16),'hex'),decode('1234567890','hex'),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);


INSERT INTO dealroom_deals(id,listing_id,buyer_id,owner_id,stage)
VALUES ('11111111-1111-4111-8111-111111111111','MNA-2047',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','qualified');

INSERT INTO dealroom_tasks(id,deal_id,title,description,assigned_to)
VALUES ('22222222-2222-4222-8222-222222222222',
        '11111111-1111-4111-8111-111111111111',
        'Confirm fictional buyer', 'Synthetic CRM workflow',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

INSERT INTO dealroom_crm_outbox(id,deal_id,event_type,payload)
VALUES ('33333333-3333-4333-8333-333333333333',
        '11111111-1111-4111-8111-111111111111',
        'dealstage_changed',
        '{"listingId":"MNA-2047","stage":"qualified","synthetic":true}'::jsonb);

DO $$
DECLARE count_grants integer;
BEGIN
  SELECT COUNT(*) INTO count_grants
    FROM dealroom_grants g JOIN dealroom_envelopes e
      ON e.envelope_id=g.envelope_id
   WHERE g.listing_id='MNA-2047'
     AND e.buyer_principal_id=g.buyer_principal_id
     AND e.provider_request_id='provider-ci-check-123';
  IF (SELECT COUNT(*) FROM dealroom_crm_outbox o JOIN dealroom_deals d ON d.id=o.deal_id
      WHERE d.listing_id='MNA-2047' AND (o.payload->>'synthetic')='true') <> 1 THEN
    RAISE EXCEPTION 'Expected one synthetic CRM event';
  END IF;

  IF count_grants <> 1 THEN RAISE EXCEPTION 'Expected one linked buyer grant'; END IF;

  -- The same principal must not receive a second grant for one listing.
  BEGIN
    INSERT INTO dealroom_grants(grant_id,listing_id,buyer_session_hash,buyer_principal_id,buyer_name,envelope_id)
      VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','MNA-2047',repeat('a',64),
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','CI Buyer','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    RAISE EXCEPTION 'Duplicate buyer grant unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END $$;
ROLLBACK;
