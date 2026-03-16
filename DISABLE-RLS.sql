-- SQL Command untuk disable RLS
-- Jalankan di Supabase SQL Editor (Database > SQL Editor)

-- ============================================================
-- PEMBAYARAN AJS (AJSquare Payment System)
-- ============================================================
ALTER TABLE "PEMBAYARAN AJS" DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- PEMBAYARAN AC (ATMAcanteen Payment System)
-- ============================================================
ALTER TABLE "PEMBAYARAN AC" DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- TENANT AJS & TENANT AC (jika belum di-disable)
-- ============================================================
ALTER TABLE "TENANT AJS" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "TENANT AC" DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Verify: cek status RLS semua tabel
-- ============================================================
SELECT 
    tablename,
    rowsecurity as "RLS Aktif?"
FROM pg_tables 
WHERE tablename IN ('PEMBAYARAN AJS', 'PEMBAYARAN AC', 'TENANT AJS', 'TENANT AC')
ORDER BY tablename;
-- Hasil yang benar: semua "RLS Aktif?" = false