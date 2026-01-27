/**
 * Frontend Code Audit Script
 * Deep analysis of frontend code for routing, buttons, and code-level issues
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

const issues = [];
const warnings = [];
const goodPractices = [];

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function addIssue(file, line, message, severity = 'error') {
    issues.push({ file, line, message, severity });
}

function addWarning(file, line, message) {
    warnings.push({ file, line, message });
}

function addGoodPractice(file, message) {
    goodPractices.push({ file, message });
}

// Read file content
function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        return null;
    }
}

// Check for common routing issues
function checkRoutingIssues(filePath, content) {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Check for hardcoded URLs that might break
        if (line.includes('href="/') && !line.includes('${') && !line.includes('encodeURIComponent')) {
            if (line.includes('/student/') || line.includes('/staff/') || line.includes('/admin/')) {
                // Static routes are okay
            }
        }

        // Check for router.push without try-catch
        if (line.includes('router.push') && !content.includes('try') && !content.includes('catch')) {
            // Check if it's inside a try-catch block
            const prevLines = lines.slice(Math.max(0, index - 10), index).join('\n');
            if (!prevLines.includes('try {')) {
                addWarning(filePath, lineNum, 'router.push without try-catch block - may cause unhandled errors');
            }
        }

        // Check for missing preventDefault on form submissions
        if (line.includes('onSubmit') && !line.includes('e.preventDefault') && !line.includes('event.preventDefault')) {
            // Check if function has preventDefault
            const nextLines = lines.slice(index, Math.min(lines.length, index + 20)).join('\n');
            if (!nextLines.includes('preventDefault')) {
                addWarning(filePath, lineNum, 'Form onSubmit without preventDefault - may cause page reload');
            }
        }

        // Check for Link components without proper href
        if (line.includes('<Link') && !line.includes('href=')) {
            addIssue(filePath, lineNum, 'Link component without href attribute', 'error');
        }

        // Check for buttons without type attribute
        if (line.includes('<button') && !line.includes('type=')) {
            addWarning(filePath, lineNum, 'Button without type attribute - defaults to "submit" which may cause issues');
        }

        // Check for onClick without proper event handling
        if (line.includes('onClick={') && line.includes('() =>') && !line.includes('e.') && !line.includes('event.')) {
            // This is okay for simple handlers
        }

        // Check for disabled buttons without aria-label
        if (line.includes('disabled') && !line.includes('aria-label') && !line.includes('title=')) {
            // Not critical but good for accessibility
        }
    });
}

// Check for state management issues
function checkStateManagement(filePath, content) {
    const lines = content.split('\n');

    // Check for useState without initial value that might cause undefined issues
    const useStateRegex = /const\s*\[\s*(\w+)\s*,\s*(\w+)\s*\]\s*=\s*useState\s*\(\s*\)/g;
    let match;
    while ((match = useStateRegex.exec(content)) !== null) {
        const stateName = match[1];
        // Check if this state is used in a way that might break with undefined
        const dangerousPatterns = [
            `${stateName}.map`,
            `${stateName}.filter`,
            `${stateName}.length`,
            `${stateName}.forEach`,
            `...${stateName}`,
            `JSON.stringify(${stateName})`
        ];

        dangerousPatterns.forEach(pattern => {
            if (content.includes(pattern)) {
                addWarning(filePath, 0, `useState for "${stateName}" initialized without default value but used with array/object methods`);
            }
        });
    }

    // Check for async functions without proper error handling
    const asyncFunctionRegex = /const\s+(\w+)\s*=\s*async\s*\(/g;
    while ((match = asyncFunctionRegex.exec(content)) !== null) {
        const funcName = match[1];
        const funcStart = content.indexOf(match[0]);
        const funcContent = content.substring(funcStart, funcStart + 500);

        if (!funcContent.includes('try') && !funcContent.includes('catch')) {
            addWarning(filePath, 0, `Async function "${funcName}" without try-catch block`);
        }
    }
}

// Check for common React issues
function checkReactIssues(filePath, content) {
    // Check for missing key props in map functions
    const mapRegex = /\.map\s*\(\s*\(?\s*\w+\s*\)?\s*=>\s*\(?\s*<\w+/g;
    let match;
    while ((match = mapRegex.exec(content)) !== null) {
        const mapIndex = match.index;
        const nextSegment = content.substring(mapIndex, mapIndex + 200);
        if (!nextSegment.includes('key=')) {
            addIssue(filePath, 0, 'Array map without key prop - will cause React warnings and performance issues', 'error');
        }
    }

    // Check for dangerouslySetInnerHTML (potential XSS)
    if (content.includes('dangerouslySetInnerHTML')) {
        addWarning(filePath, 0, 'Using dangerouslySetInnerHTML - ensure content is sanitized to prevent XSS');
    }

    // Check for inline styles that might not work with Tailwind
    if (content.includes('style={{') && content.includes('color:') && !content.includes('dynamic')) {
        // Not necessarily an issue, but worth noting
    }
}

// Check for API call issues
function checkApiIssues(filePath, content) {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Check for fetch without error handling
        if (line.includes('fetch(') && !line.includes('try')) {
            const prevLines = lines.slice(Math.max(0, index - 5), index).join('\n');
            if (!prevLines.includes('try')) {
                addWarning(filePath, lineNum, 'fetch() without try-catch - network errors will be unhandled');
            }
        }

        // Check for missing await on async calls
        if (line.includes('fetch(') && !line.includes('await') && !line.includes('.then')) {
            addIssue(filePath, lineNum, 'fetch() called without await or .then() - promise will not resolve', 'error');
        }

        // Check for JSON.parse without try-catch
        if (line.includes('JSON.parse') && !content.includes('try')) {
            addWarning(filePath, lineNum, 'JSON.parse without try-catch - may throw on invalid JSON');
        }
    });
}

// Check for accessibility issues
function checkAccessibility(filePath, content) {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Check for images without alt text
        if (line.includes('<img') && !line.includes('alt=')) {
            addWarning(filePath, lineNum, 'Image without alt attribute - accessibility issue');
        }

        // Check for interactive elements without proper roles
        if (line.includes('onClick') && line.includes('div') && !line.includes('role=')) {
            addWarning(filePath, lineNum, 'Clickable div without role="button" - accessibility issue');
        }

        // Check for form inputs without labels
        if (line.includes('<input') && !line.includes('aria-label') && !line.includes('id=')) {
            addWarning(filePath, lineNum, 'Input without label or aria-label - accessibility issue');
        }
    });
}

// Check for performance issues
function checkPerformance(filePath, content) {
    // Check for useEffect without dependency array
    const useEffectRegex = /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{/g;
    let match;
    while ((match = useEffectRegex.exec(content)) !== null) {
        const effectStart = match.index;
        const nextSegment = content.substring(effectStart, effectStart + 100);
        if (!nextSegment.includes('}, [')) {
            addWarning(filePath, 0, 'useEffect without dependency array - will run on every render');
        }
    }

    // Check for inline function definitions in render (causes re-renders)
    // This is a simplified check
    if (content.includes('onClick={() =>') && content.includes('useState')) {
        // Not necessarily an issue, but worth noting for optimization
    }
}

// Check for Tailwind CSS issues
function checkTailwindIssues(filePath, content) {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        const lineNum = index + 1;

        // Check for conflicting Tailwind classes
        const conflicts = [
            ['hidden', 'block', 'flex', 'grid'],
            ['absolute', 'relative', 'fixed', 'sticky'],
            ['w-full', 'w-auto', 'w-fit'],
            ['h-full', 'h-auto', 'h-fit'],
            ['text-left', 'text-center', 'text-right'],
            ['bg-white', 'bg-black', 'bg-transparent']
        ];

        conflicts.forEach(group => {
            const found = group.filter(cls => line.includes(cls));
            if (found.length > 1) {
                addWarning(filePath, lineNum, `Potentially conflicting Tailwind classes: ${found.join(', ')}`);
            }
        });

        // Check for arbitrary values that might break
        if (line.includes('[') && line.includes(']') && line.includes('className')) {
            // Check for invalid arbitrary values
            const invalidPatterns = ['[undefined]', '[null]', '[object'];
            invalidPatterns.forEach(pattern => {
                if (line.includes(pattern)) {
                    addIssue(filePath, lineNum, `Invalid Tailwind arbitrary value: ${pattern}`, 'error');
                }
            });
        }
    });
}

// Check for Supabase/realtime issues
function checkSupabaseIssues(filePath, content) {
    // Check for missing cleanup in useEffect
    if (content.includes('supabase') && content.includes('subscribe')) {
        if (!content.includes('return () =>') && !content.includes('unsubscribe')) {
            addWarning(filePath, 0, 'Supabase subscription without cleanup - may cause memory leaks');
        }
    }

    // Check for realtime without error handling
    if (content.includes('subscribe') && !content.includes('catch') && !content.includes('try')) {
        addWarning(filePath, 0, 'Realtime subscription without error handling');
    }
}

// Main audit function
function auditFile(filePath) {
    const content = readFile(filePath);
    if (!content) return;

    // Skip test files and node_modules
    if (filePath.includes('node_modules') || filePath.includes('.test.')) return;

    log('cyan', `\n📄 Auditing: ${filePath}`);

    checkRoutingIssues(filePath, content);
    checkStateManagement(filePath, content);
    checkReactIssues(filePath, content);
    checkApiIssues(filePath, content);
    checkAccessibility(filePath, content);
    checkPerformance(filePath, content);
    checkTailwindIssues(filePath, content);
    checkSupabaseIssues(filePath, content);
}

// Recursively find all JS/JSX files
function findJsFiles(dir, files = []) {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            findJsFiles(fullPath, files);
        } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx'))) {
            files.push(fullPath);
        }
    });

    return files;
}

// Print summary
function printSummary() {
    log('white', '\n' + '='.repeat(80));
    log('white', 'FRONTEND CODE AUDIT SUMMARY');
    log('white', '='.repeat(80));

    // Issues
    log('red', `\n❌ CRITICAL ISSUES (${issues.length}):`);
    if (issues.length === 0) {
        log('green', '   None found!');
    } else {
        issues.forEach(issue => {
            log('red', `   [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`);
            log('white', `      → ${issue.message}`);
        });
    }

    // Warnings
    log('yellow', `\n⚠️  WARNINGS (${warnings.length}):`);
    if (warnings.length === 0) {
        log('green', '   None found!');
    } else {
        warnings.forEach(warning => {
            log('yellow', `   ${warning.file}:${warning.line}`);
            log('white', `      → ${warning.message}`);
        });
    }

    // Good practices
    log('green', `\n✅ GOOD PRACTICES (${goodPractices.length}):`);
    if (goodPractices.length === 0) {
        log('white', '   (Not tracked in this audit)');
    }

    // Overall assessment
    log('white', '\n' + '='.repeat(80));
    if (issues.length === 0 && warnings.length === 0) {
        log('green', '✅ OVERALL: Frontend code is clean!');
    } else if (issues.length === 0) {
        log('yellow', '⚠️  OVERALL: Minor warnings found, but no critical issues.');
    } else {
        log('red', `❌ OVERALL: ${issues.length} critical issues need to be fixed!`);
    }
    log('white', '='.repeat(80) + '\n');
}

// Run audit
console.log('\n🔍 Starting Frontend Code Audit...\n');

const srcDir = path.join(process.cwd(), 'src');
if (fs.existsSync(srcDir)) {
    const files = findJsFiles(srcDir);
    log('blue', `Found ${files.length} JavaScript/JSX files to audit\n`);

    files.forEach(file => auditFile(file));
    printSummary();
} else {
    log('red', '❌ src directory not found!');
}

// Export results for further processing
module.exports = { issues, warnings, goodPractices };
