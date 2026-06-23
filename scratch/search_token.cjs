const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\mmari';
const searchPaths = [
    path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data'),
    path.join(userProfile, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data'),
];

console.log("Searching in paths:", searchPaths);

function searchInDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            let stats;
            try {
                stats = fs.statSync(fullPath);
            } catch (e) {
                continue;
            }
            if (stats.isDirectory()) {
                searchInDirectory(fullPath);
            } else if (stats.isFile() && (file.endsWith('.ldb') || file.endsWith('.log') || file.endsWith('.sqlite') || file.endsWith('.sqlite3') || file.endsWith('.db') || file.endsWith('.localstorage'))) {
                try {
                    // Quick check if file contains our supabase project reference
                    const content = fs.readFileSync(fullPath);
                    if (content.includes('sb-osxlcwbxlbesxcrzvoyt-auth-token')) {
                        console.log(`FOUND supabase token string in: ${fullPath}`);
                        // Try to extract email or user id
                        const strContent = content.toString('utf8', 0, content.length);
                        const match = strContent.match(/"email":"([^"]+)"/);
                        if (match) {
                            console.log(`Found email: ${match[1]}`);
                        }
                        const tokenMatch = strContent.match(/"access_token":"([^"]+)"/);
                        if (tokenMatch) {
                            console.log(`Found access_token: ${tokenMatch[1].substring(0, 20)}...`);
                        }
                        const userMatch = strContent.match(/"id":"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/i);
                        if (userMatch) {
                            console.log(`Found user_id: ${userMatch[1]}`);
                        }
                    }
                } catch (e) {
                    // Ignore read errors (e.g. file locked)
                }
            }
        }
    } catch (e) {
        // Ignore directory read errors
    }
}

for (const p of searchPaths) {
    searchInDirectory(p);
}
console.log("Search finished.");
