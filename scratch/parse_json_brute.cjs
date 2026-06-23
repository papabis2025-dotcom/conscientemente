const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\mmari';
const leveldbPath = path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb');

if (!fs.existsSync(leveldbPath)) {
    console.error("LevelDB path not found");
    return;
}

const files = fs.readdirSync(leveldbPath);

for (const file of files) {
    if (file.endsWith('.ldb') || file.endsWith('.log')) {
        const fullPath = path.join(leveldbPath, file);
        try {
            const content = fs.readFileSync(fullPath);
            const index = content.indexOf('sb-osxlcwbxlbesxcrzvoyt-auth-token');
            if (index !== -1) {
                console.log(`\nFound token key in file: ${file} at index ${index}`);
                // Let's take a larger slice to ensure we get the whole JSON
                const sliced = content.slice(index, index + 50000);
                const str = sliced.toString('utf8');
                
                const startIdx = str.indexOf('{');
                if (startIdx !== -1) {
                    // Find all indices of '}' in str
                    let pos = str.indexOf('}', startIdx);
                    let success = false;
                    while (pos !== -1) {
                        const candidate = str.substring(startIdx, pos + 1);
                        try {
                            const parsed = JSON.parse(candidate);
                            if (parsed.access_token && parsed.user) {
                                console.log("SUCCESSFULLY PARSED JSON!");
                                console.log("User email:", parsed.user.email);
                                console.log("User ID:", parsed.user.id);
                                fs.writeFileSync(path.join(__dirname, 'temp_session.json'), JSON.stringify(parsed, null, 2));
                                console.log("Saved to temp_session.json");
                                success = true;
                                break;
                            }
                        } catch (e) {
                            // Ignore parse errors
                        }
                        pos = str.indexOf('}', pos + 1);
                    }
                    if (success) break;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }
}
