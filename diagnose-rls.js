// Diagnostic tool untuk RLS issue di Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cvjzkdzuuuutgbobiwju.supabase.co';
const supabaseKey = 'sb_publishable_do3L5iqYASgCW0OowBaj3w__46lHRCX';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseRLSIssue() {
    console.log('🔍 Diagnosing RLS (Row Level Security) issue...\n');
    
    try {
        // Test 1: Check if we can read from PEMBAYARAN
        console.log('1️⃣ Testing READ access to PEMBAYARAN table...');
        const { data: readData, error: readError } = await supabase
            .from('PEMBAYARAN AJS')
            .select('*')
            .limit(1);
        
        if (readError) {
            console.log('❌ Read Error:', readError.message);
        } else {
            console.log('✅ Read access: OK');
            console.log(`   Records found: ${readData ? readData.length : 0}`);
        }
        
        // Test 2: Check authentication status
        console.log('\n2️⃣ Checking authentication status...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            console.log('❌ Auth Error:', authError.message);
        } else if (!user) {
            console.log('⚠️ No authenticated user (using anonymous access)');
            console.log('   This might be causing the RLS issue');
        } else {
            console.log('✅ Authenticated user:', user.email);
        }
        
        // Test 3: Try simple insert
        console.log('\n3️⃣ Testing INSERT access...');
        const testData = {
            tanggal_input: new Date().toISOString().split('T')[0],
            tenant: 'RLS Test Tenant',
            periode: 'Test Periode',
            jenis: 'TEST',
            tagihan: 100000,
            dibayar: 100000,
            status: 'LUNAS',
            metode: 'TEST',
            keterangan: 'RLS diagnostic test'
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('PEMBAYARAN AJS')
            .insert([testData])
            .select();
        
        if (insertError) {
            console.log('❌ Insert Error:', insertError.message);
            
            if (insertError.message.includes('row-level security')) {
                console.log('\n🛠️ SOLUTION: RLS (Row Level Security) is blocking INSERT operations');
                console.log('');
                console.log('Option 1 - DISABLE RLS (Easiest):');
                console.log('   1. Go to Supabase Dashboard');
                console.log('   2. Navigate to: Authentication → Policies');
                console.log('   3. Find "PEMBAYARAN" table');
                console.log('   4. Toggle OFF "Enable RLS" for PEMBAYARAN table');
                console.log('');
                console.log('Option 2 - CREATE POLICY (Recommended):');
                console.log('   1. Go to Supabase Dashboard → Authentication → Policies');
                console.log('   2. Click "New Policy" for PEMBAYARAN table');
                console.log('   3. Choose "Enable insert for all users"');
                console.log('   4. Or create custom policy for authenticated users only');
                console.log('');
                console.log('Option 3 - SQL COMMAND (Advanced):');
                console.log('   Run this in Supabase SQL editor:');
                console.log('   ALTER TABLE "PEMBAYARAN" DISABLE ROW LEVEL SECURITY;');
            }
        } else {
            console.log('✅ Insert access: OK');
            console.log('   Test record created successfully');
        }
        
        console.log('\n📋 SUMMARY:');
        console.log(`   Read Access: ${readError ? '❌' : '✅'}`);
        console.log(`   Auth Status: ${user ? '✅ Logged in' : '⚠️ Anonymous'}`);
        console.log(`   Insert Access: ${insertError ? '❌' : '✅'}`);
        
    } catch (error) {
        console.error('🔥 Diagnostic failed:', error.message);
    }
}

diagnoseRLSIssue();
