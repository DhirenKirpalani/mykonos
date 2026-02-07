-- Seed carrier tracking URL templates
-- Major carriers with tracking URL formats

-- USPS (United States Postal Service)
INSERT INTO carrier_tracking_urls (carrier_code, carrier_name, tracking_url_template, is_active)
VALUES (
  'USPS',
  'United States Postal Service',
  'https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking_number}',
  true
);

-- FedEx
INSERT INTO carrier_tracking_urls (carrier_code, carrier_name, tracking_url_template, is_active)
VALUES (
  'FEDEX',
  'FedEx',
  'https://www.fedex.com/fedextrack/?trknbr={tracking_number}',
  true
);

-- UPS (United Parcel Service)
INSERT INTO carrier_tracking_urls (carrier_code, carrier_name, tracking_url_template, is_active)
VALUES (
  'UPS',
  'UPS',
  'https://www.ups.com/track?tracknum={tracking_number}',
  true
);

-- DHL
INSERT INTO carrier_tracking_urls (carrier_code, carrier_name, tracking_url_template, is_active)
VALUES (
  'DHL',
  'DHL',
  'https://www.dhl.com/en/express/tracking.html?AWB={tracking_number}',
  true
);

-- Royal Mail (UK)
INSERT INTO carrier_tracking_urls (carrier_code, carrier_name, tracking_url_template, is_active)
VALUES (
  'ROYAL_MAIL',
  'Royal Mail',
  'https://www.royalmail.com/track-your-item#/tracking-results/{tracking_number}',
  true
);

-- DPD (UK)
INSERT INTO carrier_tracking_urls (carrier_code, carrier_name, tracking_url_template, is_active)
VALUES (
  'DPD',
  'DPD',
  'https://www.dpd.co.uk/apps/tracking/?reference={tracking_number}',
  true
);

-- Aramex (Middle East)
INSERT INTO carrier_tracking_urls (carrier_code, carrier_name, tracking_url_template, is_active)
VALUES (
  'ARAMEX',
  'Aramex',
  'https://www.aramex.com/us/en/track/shipments?ShipmentNumber={tracking_number}',
  true
);

-- Canada Post
INSERT INTO carrier_tracking_urls (carrier_code, carrier_name, tracking_url_template, is_active)
VALUES (
  'CANADA_POST',
  'Canada Post',
  'https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor={tracking_number}',
  true
);

-- Australia Post
INSERT INTO carrier_tracking_urls (carrier_code, carrier_name, tracking_url_template, is_active)
VALUES (
  'AUSTRALIA_POST',
  'Australia Post',
  'https://auspost.com.au/mypost/track/#/details/{tracking_number}',
  true
);

-- La Poste (France)
INSERT INTO carrier_tracking_urls (carrier_code, carrier_name, tracking_url_template, is_active)
VALUES (
  'LA_POSTE',
  'La Poste',
  'https://www.laposte.fr/outils/suivre-vos-envois?code={tracking_number}',
  true
);
