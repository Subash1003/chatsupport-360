-- =============================================================================
-- Customer Service AI Chatbot - Sample Data
-- Phase 2
--
-- Run AFTER schema.sql.
-- Safe to re-run: it clears the tables first.
--
-- Dates are written relative to CURDATE() on purpose. If they were hard-coded
-- ('2026-01-15'), then in three months every offer would be expired and the
-- "what offers are available?" test would silently return nothing.
--
-- LOGIN FOR ALL THREE SAMPLE CUSTOMERS (works from Phase 3 onwards):
--     password:  Password123!
-- The password_hash values below are real bcrypt hashes of that password.
-- =============================================================================

USE cs_chatbot;

-- Clear existing rows. FK checks are disabled briefly so the order of the
-- DELETEs does not matter; they are switched straight back on.
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE messages;
TRUNCATE TABLE conversations;
TRUNCATE TABLE otp_verifications;
TRUNCATE TABLE leads;
TRUNCATE TABLE offers;
TRUNCATE TABLE support_tickets;
TRUNCATE TABLE subscriptions;
TRUNCATE TABLE project_tasks;
TRUNCATE TABLE projects;
TRUNCATE TABLE services;
TRUNCATE TABLE id_counters;
TRUNCATE TABLE customers;
SET FOREIGN_KEY_CHECKS = 1;


-- -----------------------------------------------------------------------------
-- customers
-- Three of them, so Phase 9 can prove CUST1001 cannot read CUST1002's data.
-- -----------------------------------------------------------------------------
INSERT INTO customers (customer_id, name, email, password_hash, is_active) VALUES
('CUST1001', 'Aarav Menon',  'aarav@meridianretail.com',
 '$2b$10$TUf32G.Yf1Iy7OX6HB9gV..NT23ApBykvziDG.2nSi.jJAyaqKfDm', 1),
('CUST1002', 'Sneha Iyer',   'sneha@northwindlogistics.com',
 '$2b$10$AKastvBuPKb99Bqne2rxNeZBjvQ7l1tl.fRcP0HbrBZydOzrGgXnG', 1),
('CUST1003', 'Rahul Verma',  'rahul@zenithclinics.com',
 '$2b$10$zJm9CMWqvUm5Ia.iIZ3C6OcBM6AehFeUHRsz3SK.12Cha69A7WMTu', 1);


-- -----------------------------------------------------------------------------
-- id_counters
-- The next customer to sign up in Phase 3 becomes CUST1004.
-- -----------------------------------------------------------------------------
INSERT INTO id_counters (entity, next_value) VALUES ('customer', 1003);


-- -----------------------------------------------------------------------------
-- services  (PUBLIC)
-- -----------------------------------------------------------------------------
INSERT INTO services (name, description, price, status) VALUES
('Website Design & Redesign',
 'Responsive, mobile-first website design and redesign with custom themes, contact forms and basic on-page SEO. Indicative starting price; typical delivery 2 to 4 weeks.',
 25000.00, 'active'),

('Web Development (CMS & Custom)',
 'CMS websites on WordPress or Joomla with custom themes, blog and enquiry forms, and custom web applications and portals on PHP/Laravel or a modern JavaScript stack.',
 45000.00, 'active'),

('E-commerce Website Development',
 'Online stores on WooCommerce or a custom shopping cart with product catalogue, payment gateway integration, coupons, and order and inventory management.',
 75000.00, 'active'),

('Custom Software Development',
 'Line-of-business systems such as CRM, hotel and hostel booking, appointment scheduling and inventory, with role-based access, dashboards and reports.',
 300000.00, 'active'),

('Mobile Application Development',
 'Android and iOS mobile applications, cross-platform where it fits the budget, with a supporting web admin panel and app-store submission handled for you.',
 250000.00, 'active'),

('SEO & Digital Marketing',
 'Search engine optimisation, social media marketing, Google and social ads, and bulk SMS, email and WhatsApp campaigns, with a monthly reporting dashboard and review call. Monthly retainer, minimum three months.',
 15000.00, 'active'),

('Branding & Graphic Design',
 'Logo and corporate identity design, brochures, flyers, newsletters, 3D and packaging design. Indicative starting price for a logo; other deliverables quoted individually.',
 8000.00, 'active'),

('Web Hosting',
 'Shared hosting on our own infrastructure with a 99.9% uptime guarantee, business email, SSL and daily backups. Billed annually; VPS and dedicated options quoted separately.',
 4000.00, 'active'),

('Website Maintenance & Support',
 'Monthly plan covering content updates, security patches, CMS and plugin upgrades, backups, uptime monitoring and a guaranteed response time.',
 3000.00, 'active'),

('Flash Website Development',
 'Discontinued offering, retained for historical records only.',
 NULL, 'inactive');


-- -----------------------------------------------------------------------------
-- projects  (PRIVATE)
-- CUST1001 has two, CUST1002 has one, CUST1003 has one completed project.
-- -----------------------------------------------------------------------------
INSERT INTO projects
  (customer_id, project_name, description, status, start_date, expected_end_date, technology)
VALUES
('CUST1001', 'Meridian Retail E-commerce Platform',
 'A multi-store e-commerce platform with a customer storefront, an admin dashboard, inventory sync across three warehouses and Razorpay payment integration.',
 'in_progress', CURDATE() - INTERVAL 75 DAY, CURDATE() + INTERVAL 40 DAY,
 'React, Node.js, MySQL, Redis, AWS'),

('CUST1001', 'Meridian Loyalty Mobile App',
 'Customer loyalty and rewards mobile application with points tracking, tiered membership and push notification campaigns.',
 'planning', CURDATE() + INTERVAL 14 DAY, CURDATE() + INTERVAL 120 DAY,
 'React Native, Node.js, Firebase'),

('CUST1002', 'Northwind Fleet Tracking Portal',
 'Real-time fleet tracking dashboard with live GPS feeds, driver scorecards, route history replay and automated compliance reporting.',
 'testing', CURDATE() - INTERVAL 140 DAY, CURDATE() + INTERVAL 12 DAY,
 'Next.js, Go, PostgreSQL, MQTT, Azure'),

('CUST1003', 'Zenith Clinic Booking System',
 'Appointment booking and patient records portal for a chain of six clinics, including doctor scheduling, SMS reminders and billing exports.',
 'completed', CURDATE() - INTERVAL 300 DAY, CURDATE() - INTERVAL 45 DAY,
 'React, Node.js, MySQL, Twilio');


-- -----------------------------------------------------------------------------
-- project_tasks  (PRIVATE, reached through projects)
-- Gives the chatbot something real to answer "what is completed / pending?"
-- Subqueries look up project_id by name, so this file does not depend on
-- auto-increment values.
-- -----------------------------------------------------------------------------
INSERT INTO project_tasks (project_id, title, description, status, completed_at) VALUES
-- Meridian E-commerce (CUST1001)
((SELECT project_id FROM projects WHERE project_name = 'Meridian Retail E-commerce Platform'),
 'User authentication and account management',
 'Signup, login, password reset, saved addresses.', 'completed', NOW() - INTERVAL 55 DAY),
((SELECT project_id FROM projects WHERE project_name = 'Meridian Retail E-commerce Platform'),
 'Product catalogue and search',
 'Category browsing, filters, full-text search with typo tolerance.', 'completed', NOW() - INTERVAL 40 DAY),
((SELECT project_id FROM projects WHERE project_name = 'Meridian Retail E-commerce Platform'),
 'Shopping cart and checkout',
 'Cart persistence, coupon codes, Razorpay integration.', 'in_progress', NULL),
((SELECT project_id FROM projects WHERE project_name = 'Meridian Retail E-commerce Platform'),
 'Warehouse inventory sync',
 'Two-way stock synchronisation across three warehouses.', 'in_progress', NULL),
((SELECT project_id FROM projects WHERE project_name = 'Meridian Retail E-commerce Platform'),
 'Admin analytics dashboard',
 'Sales, returns and stock movement reporting.', 'pending', NULL),
((SELECT project_id FROM projects WHERE project_name = 'Meridian Retail E-commerce Platform'),
 'Load testing and go-live',
 'Blocked until the payment gateway production account is approved.', 'blocked', NULL),

-- Meridian Loyalty App (CUST1001)
((SELECT project_id FROM projects WHERE project_name = 'Meridian Loyalty Mobile App'),
 'Requirement workshop and scope sign-off', NULL, 'completed', NOW() - INTERVAL 5 DAY),
((SELECT project_id FROM projects WHERE project_name = 'Meridian Loyalty Mobile App'),
 'UI/UX design system', NULL, 'pending', NULL),

-- Northwind Fleet (CUST1002)
((SELECT project_id FROM projects WHERE project_name = 'Northwind Fleet Tracking Portal'),
 'Live GPS ingestion pipeline', NULL, 'completed', NOW() - INTERVAL 90 DAY),
((SELECT project_id FROM projects WHERE project_name = 'Northwind Fleet Tracking Portal'),
 'Driver scorecard module', NULL, 'completed', NOW() - INTERVAL 30 DAY),
((SELECT project_id FROM projects WHERE project_name = 'Northwind Fleet Tracking Portal'),
 'User acceptance testing', NULL, 'in_progress', NULL),

-- Zenith Clinics (CUST1003)
((SELECT project_id FROM projects WHERE project_name = 'Zenith Clinic Booking System'),
 'Appointment engine', NULL, 'completed', NOW() - INTERVAL 120 DAY),
((SELECT project_id FROM projects WHERE project_name = 'Zenith Clinic Booking System'),
 'SMS reminder integration', NULL, 'completed', NOW() - INTERVAL 60 DAY);


-- -----------------------------------------------------------------------------
-- subscriptions  (PRIVATE)
-- -----------------------------------------------------------------------------
INSERT INTO subscriptions (customer_id, service_id, start_date, end_date, status) VALUES
('CUST1001', (SELECT service_id FROM services WHERE name = 'Website Maintenance & Support'),
 CURDATE() - INTERVAL 60 DAY, CURDATE() + INTERVAL 305 DAY, 'active'),
('CUST1001', (SELECT service_id FROM services WHERE name = 'Web Hosting'),
 CURDATE() - INTERVAL 60 DAY, CURDATE() + INTERVAL 305 DAY, 'active'),
('CUST1002', (SELECT service_id FROM services WHERE name = 'SEO & Digital Marketing'),
 CURDATE() - INTERVAL 200 DAY, CURDATE() + INTERVAL 25 DAY, 'pending_renewal'),
('CUST1003', (SELECT service_id FROM services WHERE name = 'Website Maintenance & Support'),
 CURDATE() - INTERVAL 400 DAY, CURDATE() - INTERVAL 35 DAY, 'expired');


-- -----------------------------------------------------------------------------
-- support_tickets  (PRIVATE)
-- -----------------------------------------------------------------------------
INSERT INTO support_tickets (customer_id, subject, description, status, priority) VALUES
('CUST1001', 'Checkout page is slow on mobile',
 'The checkout step takes 6-8 seconds to load on 4G connections. Desktop is fine.',
 'in_progress', 'high'),
('CUST1001', 'Need two extra admin user accounts',
 'Please create admin logins for our new warehouse managers.',
 'resolved', 'low'),
('CUST1001', 'Coupon codes are case sensitive',
 'Customers typing a coupon in lowercase get an invalid code error.',
 'open', 'medium'),
('CUST1002', 'GPS feed dropped for 3 vehicles',
 'Vehicles NW-14, NW-22 and NW-31 stopped reporting location since Tuesday.',
 'open', 'urgent'),
('CUST1003', 'Export billing report to Excel',
 'Requested a monthly billing export. Delivered and signed off.',
 'closed', 'low');


-- -----------------------------------------------------------------------------
-- offers  (PUBLIC)
-- Three currently valid, one already expired, so you can verify that the
-- "active offers" query really does filter by date.
-- -----------------------------------------------------------------------------
INSERT INTO offers (title, description, discount, valid_from, valid_until, status) VALUES
('New Website Launch Offer',
 'New clients receive 15% off any website design and development package confirmed this quarter.',
 15.00, CURDATE() - INTERVAL 20 DAY, CURDATE() + INTERVAL 40 DAY, 'active'),

('Free SEO Audit',
 'A complimentary SEO and website performance audit, worth 10,000 INR, with every new SEO & Digital Marketing engagement.',
 0.00, CURDATE() - INTERVAL 10 DAY, CURDATE() + INTERVAL 80 DAY, 'active'),

('Annual Hosting + Maintenance Bundle',
 'Pay for ten months of Website Maintenance & Support and get twelve, with one year of Web Hosting included. Around 17% off.',
 16.67, CURDATE() - INTERVAL 5 DAY, CURDATE() + INTERVAL 120 DAY, 'active'),

('Diwali Website Refresh Offer',
 'Expired seasonal promotion on website redesign packages.',
 20.00, CURDATE() - INTERVAL 200 DAY, CURDATE() - INTERVAL 140 DAY, 'expired');


-- -----------------------------------------------------------------------------
-- leads  (submitted by visitors)
-- -----------------------------------------------------------------------------
INSERT INTO leads (name, email, project_type, description, budget, timeline, status) VALUES
('Divya Krishnan', 'divya.k@brightpath.in', 'Web Portal',
 'We need a student portal website for about 2,000 students with course pages, downloads and online enquiry forms.',
 '3-5 lakhs', '3 months', 'new'),
('Mohammed Faizal', 'faizal@cargolinkme.com', 'E-commerce Website',
 'Looking for a WooCommerce store for auto parts with around 1,500 products and Razorpay checkout.',
 'Around 1.5 lakhs', '2 months', 'contacted');


-- -----------------------------------------------------------------------------
-- conversations + messages  (Phase 10 preview)
-- One logged-in customer conversation, one anonymous visitor conversation.
-- Note the visitor row has customer_id = NULL.
-- -----------------------------------------------------------------------------
INSERT INTO conversations (customer_id, session_id) VALUES
('CUST1001', 'seed-session-cust1001'),
(NULL,       'seed-session-visitor');

INSERT INTO messages (conversation_id, sender, message) VALUES
((SELECT conversation_id FROM conversations WHERE session_id = 'seed-session-cust1001'),
 'user', 'What is the status of my project?'),
((SELECT conversation_id FROM conversations WHERE session_id = 'seed-session-cust1001'),
 'bot',  'Your Meridian Retail E-commerce Platform is currently in progress, with an expected completion date about 40 days from now.'),
((SELECT conversation_id FROM conversations WHERE session_id = 'seed-session-visitor'),
 'user', 'Do you build mobile apps?'),
((SELECT conversation_id FROM conversations WHERE session_id = 'seed-session-visitor'),
 'bot',  'Yes. We build cross-platform iOS and Android applications using React Native, and native apps where required.');


-- -----------------------------------------------------------------------------
-- Verification summary
-- -----------------------------------------------------------------------------
SELECT 'customers'       AS table_name, COUNT(*) AS rows_inserted FROM customers
UNION ALL SELECT 'projects',        COUNT(*) FROM projects
UNION ALL SELECT 'project_tasks',   COUNT(*) FROM project_tasks
UNION ALL SELECT 'services',        COUNT(*) FROM services
UNION ALL SELECT 'subscriptions',   COUNT(*) FROM subscriptions
UNION ALL SELECT 'support_tickets', COUNT(*) FROM support_tickets
UNION ALL SELECT 'offers',          COUNT(*) FROM offers
UNION ALL SELECT 'leads',           COUNT(*) FROM leads
UNION ALL SELECT 'conversations',   COUNT(*) FROM conversations
UNION ALL SELECT 'messages',        COUNT(*) FROM messages;
