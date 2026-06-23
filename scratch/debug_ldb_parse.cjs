const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\mmari';
const filePath = path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb', '000974.ldb');

if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
}

const content = fs.readFileSync(filePath);
const index = content.indexOf('sb-osxlcwbxlbesxcrzvoyt-auth-token');
if (index === -1) {
    console.error("Token key not found in file.");
    return;
}

console.log("Token key found at index:", index);
const sliced = content.slice(index, index + 80000); // Take a very large slice
const str = sliced.toString('utf8');
const startIdx = str.indexOf('{');
if (startIdx === -1) {
    console.error("No '{' found after key.");
    return;
}

console.log("startIdx:", startIdx);
let pos = str.indexOf('}', startIdx);
let lastError = null;
let foundBraces = 0;
while (pos !== -1) {
    foundBraces++;
    const candidate = str.substring(startIdx, pos + 1);
    try {
        const parsed = JSON.parse(candidate);
        if (parsed.access_token) {
            console.log("SUCCESS! Parsed JSON at position:", pos);
            console.log("User email:", parsed.user.email);
            return;
        }
    } catch (e) {
        lastError = e;
    }
    pos = str.indexOf('}', pos + 1);
}

console.log(`Found ${foundBraces} closing braces. Last error:`, lastError ? lastError.message : "None");
if (str.length > 500) {
    console.log("UTF-8 snippet starts with:", str.substring(startIdx, startIdx + 200));
    console.log("UTF-8 snippet ends with:", str.substring(str.length - 200));
}
