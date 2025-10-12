import * as fs from 'fs';
import * as path from 'path';

// Read CSS file at compile time
function loadCSS(): string {
    const cssPath = path.join(__dirname, 'commandRunner.css');
    return fs.readFileSync(cssPath, 'utf8');
}

export const commandRunnerCSS = loadCSS();