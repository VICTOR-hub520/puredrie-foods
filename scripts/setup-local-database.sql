\set ON_ERROR_STOP on

SELECT 'CREATE ROLE puredrie_app LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'puredrie_app')
\gexec

\password puredrie_app

SELECT 'CREATE DATABASE puredrie OWNER puredrie_app'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'puredrie')
\gexec
