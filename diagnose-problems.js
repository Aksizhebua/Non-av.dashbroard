// Comprehensive diagnostic tool for AJSquare Payment System
console.log('🔍 COMPREHENSIVE SYSTEM DIAGNOSTICS\n');
console.log('═══════════════════════════════════════════════════════════');

const fs = require('fs');
const path = require('path');

// Test 1: File Structure Check
console.log('1️⃣ CHECKING FILE STRUCTURE...');
const requiredFiles = [
    'app.js',
    'index.html', 
    'kelola-ajsquare.html',
    'login.html',
    'server.js',
    'package.json'
];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✅ ${file} - Found`);
    } else {
        console.log(`   ❌ ${file} - Missing!`);
    }
});

console.log('\n2️⃣ CHECKING SYNTAX ERRORS...');

// Test 2: JavaScript Syntax Check
try {
    console.log('   🔍 Checking app.js syntax...');
    const appContent = fs.readFileSync('app.js', 'utf8');
    
    // Check for common syntax issues
    const syntaxChecks = [
        { pattern: /function\s+\w+\s*\([^)]*\)\s*{/, name: 'Function declarations' },
        { pattern: /const\s+\w+\s*=/, name: 'Const declarations' },
        { pattern: /\}\s*catch\s*\([^)]*\)\s*{/, name: 'Try-catch blocks' },
        { pattern: /addEventListener\s*\([^)]+\)/, name: 'Event listeners' }
    ];
    
    syntaxChecks.forEach(check => {
        const matches = appContent.match(new RegExp(check.pattern, 'g'));
        console.log(`      ${check.name}: ${matches ? matches.length : 0} instances`);
    });
    
    // Check for potential issues
    const issues = [];
    
    if (appContent.includes('setupSmoothTabNavigation') && 
        !appContent.includes('function setupSmoothTabNavigation')) {
        issues.push('setupSmoothTabNavigation function is called but not defined');
    }
    
    if (appContent.includes('loadPaymentHistory') && 
        !appContent.includes('function loadPaymentHistory')) {
        issues.push('loadPaymentHistory function is called but not defined');
    }
    
    if (appContent.includes('loadTenantList') && 
        !appContent.includes('function loadTenantList')) {
        issues.push('loadTenantList function is called but not defined');
    }
    
    if (issues.length > 0) {
        console.log('   ⚠️ Potential JavaScript issues found:');
        issues.forEach(issue => console.log(`      - ${issue}`));
    } else {
        console.log('   ✅ No obvious JavaScript syntax issues detected');
    }
    
} catch (error) {
    console.log(`   ❌ Error reading app.js: ${error.message}`);
}

console.log('\n3️⃣ CHECKING HTML STRUCTURE...');

// Test 3: HTML Structure Check
try {
    console.log('   🔍 Checking kelola-ajsquare.html structure...');
    const htmlContent = fs.readFileSync('kelola-ajsquare.html', 'utf8');
    
    const htmlChecks = [
        { pattern: /id="pills-input-tab"/, name: 'Form Input tab' },
        { pattern: /id="pills-progres-tab"/, name: 'Progress tab' },
        { pattern: /id="pills-input"/, name: 'Form Input content' },
        { pattern: /id="pills-progres"/, name: 'Progress content' },
        { pattern: /id="formPembayaran"/, name: 'Payment form' },
        { pattern: /id="inputTenant"/, name: 'Tenant dropdown' },
        { pattern: /id="tabelData"/, name: 'Data table' },
        { pattern: /id="filterTenant"/, name: 'Filter dropdown' }
    ];
    
    htmlChecks.forEach(check => {
        const found = htmlContent.includes(check.pattern.source.replace(/[\/\\]/g, ''));
        console.log(`      ${check.name}: ${found ? '✅ Found' : '❌ Missing'}`);
    });
    
} catch (error) {
    console.log(`   ❌ Error reading HTML file: ${error.message}`);
}

console.log('\n4️⃣ CHECKING SERVER CONFIGURATION...');

// Test 4: Server Configuration Check
try {
    console.log('   🔍 Checking server.js...');
    const serverContent = fs.readFileSync('server.js', 'utf8');
    
    const serverChecks = [
        { pattern: /http\.createServer/, name: 'HTTP server creation' },
        { pattern: /server\.listen/, name: 'Server listen' },
        { pattern: /MIME.*type/, name: 'MIME type handling' },
        { pattern: /404/, name: '404 error handling' }
    ];
    
    serverChecks.forEach(check => {
        const found = serverContent.match(new RegExp(check.pattern));
        console.log(`      ${check.name}: ${found ? '✅ Found' : '❌ Missing'}`);
    });
    
} catch (error) {
    console.log(`   ❌ Error reading server.js: ${error.message}`);
}

console.log('\n5️⃣ CHECKING DEPENDENCIES...');

// Test 5: Dependencies Check
try {
    console.log('   🔍 Checking package.json...');
    const packageContent = fs.readFileSync('package.json', 'utf8');
    const packageData = JSON.parse(packageContent);
    
    console.log(`      Package name: ${packageData.name || 'Not specified'}`);
    console.log(`      Scripts: ${Object.keys(packageData.scripts || {}).join(', ') || 'None'}`);
    console.log(`      Dependencies: ${Object.keys(packageData.dependencies || {}).join(', ') || 'None'}`);
    
} catch (error) {
    console.log(`   ❌ Error reading package.json: ${error.message}`);
}

console.log('\n6️⃣ CHECKING SUPABASE CONFIGURATION...');

// Test 6: Supabase Configuration Check
try {
    console.log('   🔍 Checking Supabase config in app.js...');
    const appContent = fs.readFileSync('app.js', 'utf8');
    
    const supabaseUrl = appContent.match(/supabaseUrl\s*=\s*['"`](.*?)['"`]/);
    const supabaseKey = appContent.match(/supabaseKey\s*=\s*['"`](.*?)['"`]/);
    
    console.log(`      Supabase URL: ${supabaseUrl ? '✅ Configured' : '❌ Missing'}`);
    console.log(`      Supabase Key: ${supabaseKey ? '✅ Configured' : '❌ Missing'}`);
    
    if (supabaseUrl && supabaseUrl[1]) {
        console.log(`      URL: ${supabaseUrl[1]}`);
    }
    
} catch (error) {
    console.log(`   ❌ Error checking Supabase config: ${error.message}`);
}

console.log('\n7️⃣ COMMON ISSUES CHECKLIST...');

console.log('   🔍 Checking for common problems...');

const commonIssues = [
    {
        name: 'Bootstrap CSS/JS loaded',
        check: () => {
            const htmlContent = fs.readFileSync('kelola-ajsquare.html', 'utf8');
            return htmlContent.includes('bootstrap') && htmlContent.includes('cdn');
        }
    },
    {
        name: 'Supabase JS loaded',
        check: () => {
            const htmlContent = fs.readFileSync('kelola-ajsquare.html', 'utf8');
            return htmlContent.includes('@supabase/supabase-js');
        }
    },
    {
        name: 'App.js loaded in HTML',
        check: () => {
            const htmlContent = fs.readFileSync('kelola-ajsquare.html', 'utf8');
            return htmlContent.includes('app.js');
        }
    },
    {
        name: 'Tab navigation structure',
        check: () => {
            const htmlContent = fs.readFileSync('kelola-ajsquare.html', 'utf8');
            return htmlContent.includes('pills-input-tab') && htmlContent.includes('pills-progres-tab');
        }
    }
];

commonIssues.forEach(issue => {
    try {
        const result = issue.check();
        console.log(`      ${issue.name}: ${result ? '✅ OK' : '❌ Problem'}`);
    } catch (error) {
        console.log(`      ${issue.name}: ❌ Check failed`);
    }
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('🎯 DIAGNOSTIC SUMMARY');
console.log('═══════════════════════════════════════════════════════════');

// Test server connectivity
console.log('\n8️⃣ TESTING SERVER CONNECTIVITY...');
console.log('   To complete diagnostics, please:');
console.log('   1. Start the server: node server.js');
console.log('   2. Check these URLs:');
console.log('      - http://localhost:[PORT]/login.html');
console.log('      - http://localhost:[PORT]/kelola-ajsquare.html');
console.log('      - http://localhost:[PORT]/app.js');

console.log('\n📋 NEXT STEPS:');
console.log('   If you see any ❌ marks above, those are the issues to fix.');
console.log('   Run this diagnostic after making changes to verify fixes.');

console.log('\n✨ Diagnostic complete! Please share the output to identify specific issues.');