-- =============================================================================
-- Customer Service AI Chatbot - Database Schema
-- Phase 2
--
-- Run this whole file once in MySQL Workbench (see backend/README.md).
-- It is safe to re-run: it drops and recreates everything.
--
-- Design notes:
--  * InnoDB everywhere, because we need real FOREIGN KEYs and transactions.
--  * utf8mb4 so names, currency symbols and emoji all store correctly.
--  * VARCHAR(190) for indexed email columns - safe index length on every
--    MySQL version, including older 5.7 installs.
--  * Every table that holds private data has customer_id INDEXED. Phase 9's
--    data-isolation rule means almost every query will filter on it, so the
--    index is not optional.
-- =============================================================================

DROP DATABASE IF EXISTS cs_chatbot;
CREATE DATABASE cs_chatbot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cs_chatbot;


-- =============================================================================
-- 1. customers
--
-- customer_id is a readable string ('CUST1001') rather than an auto-increment
-- number, because this exact value goes into:
--   - the JWT payload             (Phase 3)
--   - every private SQL WHERE     (Phase 4)
--   - Qdrant document metadata    (Phase 5)
-- Seeing "CUST1001" in a log or a vector payload is far easier to debug than
-- seeing "7".
-- =============================================================================
CREATE TABLE customers (
  customer_id    VARCHAR(20)  NOT NULL,
  name           VARCHAR(120) NOT NULL,
  email          VARCHAR(190) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,          -- bcrypt output, always 60 chars
  is_active      TINYINT(1)   NOT NULL DEFAULT 1, -- lets you disable an account
                                                  -- without deleting its data
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (customer_id),
  UNIQUE KEY uq_customers_email (email)          -- the login lookup + stops
                                                  -- duplicate signups
) ENGINE=InnoDB;


-- =============================================================================
-- 2. id_counters
--
-- How do we generate CUST1002 after CUST1001 without two people signing up at
-- the same instant getting the same ID?
--
-- This one-row-per-entity table gives us an atomic counter. In Phase 3 we run:
--
--     UPDATE id_counters
--        SET next_value = LAST_INSERT_ID(next_value + 1)
--      WHERE entity = 'customer';
--     SELECT LAST_INSERT_ID();          -- our reserved number, ours alone
--
-- MySQL's LAST_INSERT_ID(expr) trick makes the increment and the read atomic
-- and connection-local, so concurrent signups can never collide.
-- =============================================================================
CREATE TABLE id_counters (
  entity      VARCHAR(50)     NOT NULL,
  next_value  BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (entity)
) ENGINE=InnoDB;


-- =============================================================================
-- 3. projects   (private customer data)
-- =============================================================================
CREATE TABLE projects (
  project_id        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id       VARCHAR(20)  NOT NULL,
  project_name      VARCHAR(150) NOT NULL,
  description       TEXT         NULL,
  status            ENUM('planning','in_progress','on_hold','testing',
                          'completed','cancelled')
                    NOT NULL DEFAULT 'planning',
  start_date        DATE         NULL,
  expected_end_date DATE         NULL,
  technology        VARCHAR(255) NULL,   -- comma separated, e.g. "React, Node.js"
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (project_id),
  KEY idx_projects_customer (customer_id),
  KEY idx_projects_customer_status (customer_id, status),

  CONSTRAINT fk_projects_customer
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
    ON DELETE CASCADE          -- deleting a customer removes their projects
    ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =============================================================================
-- 4. project_tasks   (private, reached through projects)
--
-- Answers "what features are completed / still pending?"
-- Note there is no customer_id column here on purpose: a task belongs to a
-- project, and a project belongs to a customer. Queries must JOIN through
-- projects and filter on projects.customer_id.
-- =============================================================================
CREATE TABLE project_tasks (
  task_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id   BIGINT UNSIGNED NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT         NULL,
  status       ENUM('pending','in_progress','blocked','completed')
               NOT NULL DEFAULT 'pending',
  completed_at DATETIME     NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (task_id),
  KEY idx_tasks_project_status (project_id, status),

  CONSTRAINT fk_tasks_project
    FOREIGN KEY (project_id) REFERENCES projects (project_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =============================================================================
-- 5. services   (PUBLIC data - safe for visitors)
-- =============================================================================
CREATE TABLE services (
  service_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150)  NOT NULL,
  description TEXT          NULL,
  price       DECIMAL(12,2) NULL,   -- "starting from" price; NULL = quote only
  status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (service_id),
  UNIQUE KEY uq_services_name (name),
  KEY idx_services_status (status)
) ENGINE=InnoDB;


-- =============================================================================
-- 6. subscriptions   (private: which services a customer currently pays for)
-- =============================================================================
CREATE TABLE subscriptions (
  subscription_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id     VARCHAR(20)     NOT NULL,
  service_id      BIGINT UNSIGNED NOT NULL,
  start_date      DATE            NOT NULL,
  end_date        DATE            NULL,   -- NULL = open ended
  status          ENUM('active','expired','cancelled','pending_renewal')
                  NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (subscription_id),
  KEY idx_subscriptions_customer (customer_id, status),
  KEY idx_subscriptions_service (service_id),

  CONSTRAINT fk_subscriptions_customer
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  -- RESTRICT, not CASCADE: you must not be able to delete a service that
  -- customers are still subscribed to.
  CONSTRAINT fk_subscriptions_service
    FOREIGN KEY (service_id) REFERENCES services (service_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =============================================================================
-- 7. support_tickets   (private customer data)
-- =============================================================================
CREATE TABLE support_tickets (
  ticket_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id VARCHAR(20)  NOT NULL,
  subject     VARCHAR(200) NOT NULL,
  description TEXT         NULL,
  status      ENUM('open','in_progress','waiting_on_customer','resolved','closed')
              NOT NULL DEFAULT 'open',
  priority    ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (ticket_id),
  KEY idx_tickets_customer_status (customer_id, status),

  CONSTRAINT fk_tickets_customer
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =============================================================================
-- 8. offers   (PUBLIC data - safe for visitors)
--
-- "What offers are available?" becomes:
--   WHERE status = 'active' AND CURDATE() BETWEEN valid_from AND valid_until
-- =============================================================================
CREATE TABLE offers (
  offer_id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(150)  NOT NULL,
  description TEXT          NULL,
  discount    DECIMAL(5,2)  NULL,   -- percentage, e.g. 15.00 means 15% off
  valid_from  DATE          NOT NULL,
  valid_until DATE          NOT NULL,
  status      ENUM('active','inactive','expired') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (offer_id),
  KEY idx_offers_active (status, valid_from, valid_until)
) ENGINE=InnoDB;


-- =============================================================================
-- 9. leads   (submitted by visitors - Phase 11)
--
-- budget and timeline are VARCHAR, not numbers: people type "5-8 lakhs" or
-- "around 3 months". Forcing them into a number would lose information.
-- No foreign key to customers - a lead is by definition not a customer yet.
-- =============================================================================
CREATE TABLE leads (
  lead_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120) NOT NULL,
  email        VARCHAR(190) NOT NULL,
  project_type VARCHAR(100) NULL,
  description  TEXT         NULL,
  budget       VARCHAR(100) NULL,
  timeline     VARCHAR(100) NULL,
  status       ENUM('new','contacted','qualified','converted','closed')
               NOT NULL DEFAULT 'new',
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (lead_id),
  KEY idx_leads_email (email),
  KEY idx_leads_status (status)
) ENGINE=InnoDB;


-- =============================================================================
-- 10. conversations   (Phase 10 - chat memory)
--
-- customer_id is NULLABLE, and that is the important part:
--   NULL      -> an anonymous visitor, identified only by session_id
--   'CUST...' -> a logged-in customer
-- The chatbot must work for both, so the schema has to allow both.
-- =============================================================================
CREATE TABLE conversations (
  conversation_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id     VARCHAR(20)  NULL,
  session_id      VARCHAR(100) NOT NULL,  -- random id generated by the browser
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (conversation_id),
  KEY idx_conversations_customer (customer_id),
  KEY idx_conversations_session (session_id),

  CONSTRAINT fk_conversations_customer
    FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =============================================================================
-- 11. messages   (Phase 10)
--
-- sender is an ENUM so a stray value can never be stored. 'system' is there
-- for notices the UI shows that did not come from the user or the model.
-- =============================================================================
CREATE TABLE messages (
  message_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender          ENUM('user','bot','system') NOT NULL,
  message         TEXT      NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (message_id),
  -- Composite index: "give me this conversation's messages in order" is the
  -- only read pattern we will ever have.
  KEY idx_messages_conversation (conversation_id, message_id),

  CONSTRAINT fk_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (conversation_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;


-- =============================================================================
-- 12. otp_verifications   (Phase 3)
--
-- Deliberately has NO foreign key to customers: a signup OTP is sent before
-- the customer row exists.
--
-- We store otp_hash, never the OTP itself. An OTP is a short-lived password;
-- anyone reading the database should not be able to use it. Same reasoning as
-- password_hash.
--
-- `attempts` lets Phase 3 lock an OTP after N wrong guesses, so a 6-digit code
-- cannot be brute forced.
-- =============================================================================
CREATE TABLE otp_verifications (
  otp_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email       VARCHAR(190) NOT NULL,
  otp_hash    VARCHAR(255) NOT NULL,
  purpose     ENUM('signup','password_reset') NOT NULL,
  expires_at  DATETIME     NOT NULL,
  consumed_at DATETIME     NULL,           -- set once used, so it cannot be reused
  attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (otp_id),
  KEY idx_otp_lookup (email, purpose, expires_at)
) ENGINE=InnoDB;


-- =============================================================================
-- Done. Run seed.sql next to load sample data.
-- =============================================================================
SELECT 'Schema created successfully' AS result;
