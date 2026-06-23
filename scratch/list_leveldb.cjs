const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\mmari';
const leveldbPath = path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb');

if (!fs.existsSync(leveldbPath)) {
    console.error("LevelDB path not found");
    return;
}

const files = fs.readdirSync(leveldbPath);
files.forEach(file => {
    const fullPath = path.join(leveldbPath, file);
    const stats = fs.statSync(fullPath);
    console.log(`${file}: ${stats.size} bytes`);
});
