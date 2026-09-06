-- ============================================================================
-- seed-subash.sql   (additive, idempotent — safe to re-run)
--
-- Sample data for an EXISTING client: Subash / Subash Enterprises.
-- Customer since 10-Oct-2025. Came to 360 Degree Info for company branding
-- (delivered & signed off) and now has a business website in development.
--
-- Run with MySQL Workbench, or:
--   mysql -u root cs_chatbot < backend/database/seed-subash.sql
--
-- Does NOT touch any other customer. Deleting CUST1006 cascades to its
-- projects / tasks / subscriptions / tickets, then everything is re-inserted.
-- Login:  subashv2003.10@gmail.com  /  Password123!
-- ============================================================================

USE cs_chatbot;

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM support_tickets WHERE customer_id = 'CUST1006';
DELETE FROM subscriptions   WHERE customer_id = 'CUST1006';
DELETE FROM project_tasks   WHERE project_id IN (SELECT project_id FROM projects WHERE customer_id = 'CUST1006');
DELETE FROM projects        WHERE customer_id = 'CUST1006';
DELETE FROM customers       WHERE customer_id = 'CUST1006';
SET FOREIGN_KEY_CHECKS = 1;

-- --- customer ----------------------------------------------------------------
-- password_hash verifies "Password123!" (same bcrypt string as the seed users).
INSERT INTO customers (customer_id, name, email, password_hash, is_active, created_at)
VALUES (
  'CUST1006', 'Subash', 'subashv2003.10@gmail.com',
  '$2b$10$TUf32G.Yf1Iy7OX6HB9gV..NT23ApBykvziDG.2nSi.jJAyaqKfDm', 1,
  '2025-10-10 10:00:00'
);

-- Keep the id counter ahead so the next real signup is CUST1007.
UPDATE id_counters SET next_value = 1006 WHERE entity = 'customer' AND next_value < 1006;

-- --- projects --------------------------------------------------------------
-- 1) Company branding — COMPLETED and delivered.
INSERT INTO projects
  (customer_id, project_name, description, status, start_date, expected_end_date, technology, created_at)
VALUES
('CUST1006', 'Subash Enterprises Brand Identity',
 'Complete brand identity package for Subash Enterprises: primary and secondary logo, colour palette, typography system, a brand guidelines document, business cards, letterhead and a social-media kit. Delivered and signed off by the client.',
 'completed', '2025-10-15', '2025-12-10', 'Adobe Illustrator, Adobe Photoshop, Figma',
 '2025-10-15 09:30:00');

-- 2) Business website — CURRENTLY BEING BUILT.
INSERT INTO projects
  (customer_id, project_name, description, status, start_date, expected_end_date, technology, created_at)
VALUES
('CUST1006', 'Subash Enterprises Business Website',
 'Corporate WordPress website for Subash Enterprises applying the new brand identity. Nine pages including services and portfolio, a blog, enquiry and quote forms, Google Maps and basic on-page SEO. Currently in development; staging link shared with the client.',
 'in_progress', '2026-07-15', '2026-10-31', 'WordPress, PHP, MySQL, Elementor',
 '2026-07-15 11:00:00');

-- --- project tasks ------------------------------------------------------------
-- Branding tasks (all done).
INSERT INTO project_tasks (project_id, title, description, status, completed_at, created_at) VALUES
((SELECT project_id FROM projects WHERE customer_id='CUST1006' AND project_name='Subash Enterprises Brand Identity'),
 'Discovery workshop & brand brief', 'Workshop with Subash to capture positioning, audience and visual direction.', 'completed', '2025-10-22 16:00:00', '2025-10-15 09:40:00'),
((SELECT project_id FROM projects WHERE customer_id='CUST1006' AND project_name='Subash Enterprises Brand Identity'),
 'Logo concepts & revisions', 'Three initial logo routes, two rounds of revisions, final selection.', 'completed', '2025-11-12 15:00:00', '2025-10-23 10:00:00'),
((SELECT project_id FROM projects WHERE customer_id='CUST1006' AND project_name='Subash Enterprises Brand Identity'),
 'Colour palette & typography system', 'Primary/secondary palette with hex + CMYK, heading and body typefaces, usage rules.', 'completed', '2025-11-20 13:00:00', '2025-11-13 10:00:00'),
((SELECT project_id FROM projects WHERE customer_id='CUST1006' AND project_name='Subash Enterprises Brand Identity'),
 'Brand guidelines document', '24-page PDF: logo usage, spacing, colour, type, do/dont, imagery.', 'completed', '2025-12-02 12:00:00', '2025-11-21 10:00:00'),
((SELECT project_id FROM projects WHERE customer_id='CUST1006' AND project_name='Subash Enterprises Brand Identity'),
 'Stationery & social-media kit', 'Business card, letterhead, email signature, and templated social post/cover art.', 'completed', '2025-12-09 17:00:00', '2025-12-03 10:00:00');

-- Website tasks (mixed).
INSERT INTO project_tasks (project_id, title, description, status, completed_at, created_at) VALUES
((SELECT project_id FROM projects WHERE customer_id='CUST1006' AND project_name='Subash Enterprises Business Website'),
 'Information architecture & sitemap', 'Page list, navigation and URL structure agreed with the client.', 'completed', '2026-07-28 14:00:00', '2026-07-15 11:10:00'),
((SELECT project_id FROM projects WHERE customer_id='CUST1006' AND project_name='Subash Enterprises Business Website'),
 'Homepage & inner page design (Figma)', 'High-fidelity designs for homepage plus five inner page templates.', 'completed', '2026-08-14 16:30:00', '2026-07-29 10:00:00'),
((SELECT project_id FROM projects WHERE customer_id='CUST1006' AND project_name='Subash Enterprises Business Website'),
 'WordPress theme build & content entry', 'Build the approved designs in WordPress/Elementor and load client-supplied content.', 'in_progress', NULL, '2026-08-15 10:00:00'),
((SELECT project_id FROM projects WHERE customer_id='CUST1006' AND project_name='Subash Enterprises Business Website'),
 'Enquiry & quote forms + Google Maps', 'Contact, quote-request and newsletter forms with spam protection; embedded map.', 'pending', NULL, '2026-08-15 10:05:00'),
((SELECT project_id FROM projects WHERE customer_id='CUST1006' AND project_name='Subash Enterprises Business Website'),
 'On-page SEO & performance pass', 'Titles/meta, headings, alt text, image compression, caching, Core Web Vitals check.', 'pending', NULL, '2026-08-15 10:10:00'),
((SELECT project_id FROM projects WHERE customer_id='CUST1006' AND project_name='Subash Enterprises Business Website'),
 'UAT & go-live', 'Client testing on staging, fixes, DNS cutover and post-launch checks.', 'pending', NULL, '2026-08-15 10:15:00');

-- --- subscriptions ---------------------------------------------------------
INSERT INTO subscriptions (customer_id, service_id, start_date, end_date, status, created_at) VALUES
('CUST1006', (SELECT service_id FROM services WHERE name = 'SEO & Digital Marketing'),
 '2025-11-01', '2026-11-01', 'active', '2025-11-01 10:00:00'),
('CUST1006', (SELECT service_id FROM services WHERE name = 'Web Hosting'),
 '2026-07-01', '2027-07-01', 'active', '2026-07-01 10:00:00');

-- --- support tickets ------------------------------------------------------------
INSERT INTO support_tickets (customer_id, subject, description, status, priority, created_at, updated_at) VALUES
('CUST1006', 'Request extra logo colour variants (dark background)',
 'Need white and single-colour versions of the logo for dark backgrounds and print use.',
 'resolved', 'medium', '2025-11-15 10:20:00', '2025-11-18 09:00:00'),
('CUST1006', 'Brand guidelines PDF fonts not embedding',
 'Fonts fall back to a system typeface when the brand guidelines PDF is opened on another machine.',
 'closed', 'low', '2025-12-05 15:40:00', '2025-12-08 11:00:00'),
('CUST1006', 'Add a Careers page to the new website',
 'Please include a simple Careers page with one job listing and an application form.',
 'open', 'medium', '2026-08-22 12:00:00', '2026-08-22 12:00:00'),
('CUST1006', 'Staging site loads slowly on mobile',
 'The staging website takes 6-8 seconds to load on 4G. Please optimise images and caching before UAT.',
 'in_progress', 'high', '2026-08-29 09:15:00', '2026-08-30 10:00:00');

-- --- check ----------------------------------------------------------------------
SELECT 'customer' AS t, customer_id, name, email, created_at FROM customers WHERE customer_id='CUST1006';
SELECT 'projects' AS t, project_id, project_name, status FROM projects WHERE customer_id='CUST1006';
SELECT 'tasks' AS t, COUNT(*) FROM project_tasks WHERE project_id IN (SELECT project_id FROM projects WHERE customer_id='CUST1006');
SELECT 'subscriptions' AS t, s.status, svc.name FROM subscriptions s JOIN services svc ON svc.service_id=s.service_id WHERE s.customer_id='CUST1006';
SELECT 'tickets' AS t, ticket_id, status, priority, subject FROM support_tickets WHERE customer_id='CUST1006';
