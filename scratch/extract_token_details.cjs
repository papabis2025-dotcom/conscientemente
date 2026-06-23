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
                const sliced = content.slice(index, index + 50000);
                const str = sliced.toString('utf8');
                
                const startIdx = str.indexOf('{');
                console.log(`startIdx of '{': ${startIdx}`);
                if (startIdx !== -1) {
                    let openBrackets = 0;
                    let endIdx = -1;
                    for (let i = startIdx; i < str.length; i++) {
                        if (str[i] === '{') openBrackets++;
                        else if (str[i] === '}') {
                            openBrackets--;
                            if (openBrackets === 0) {
                                endIdx = i;
                                break;
                            }
                        }
                    }
                    console.log(`endIdx of '}': ${endIdx}`);
                    if (endIdx !== -1) {
                        const jsonStr = str.substring(startIdx, endIdx + 1);
                        console.log(`Candidate JSON string length: ${jsonStr.length}`);
                        try {
                            const parsed = JSON.parse(jsonStr);
                            if (parsed.access_token) {
                                console.log("SUCCESSFULLY EXTRACTED JSON!");
                                console.log("User email:", parsed.user.email);
                                console.log("User ID:", parsed.user.id);
                                
                                fs.writeFileSync(path.join(__dirname, 'temp_session.json'), JSON.stringify(parsed, null, 2));
                                console.log("Wrote temp_session.json");
                                break;
                            }
                        } catch (e) {
                            console.log("Failed to parse extracted JSON:", e.message);
                            console.log("Candidate JSON starts with:", jsonStr.substring(0, 150));
                            console.log("Candidate JSON ends with:", jsonStr.substring(jsonStr.length - 150));
                        }
                    } else {
                        console.log("Could not find matching closing bracket } in slice of size 50000.");
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    }
}
