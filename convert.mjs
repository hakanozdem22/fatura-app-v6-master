import fs from 'fs';
import path from 'path';

const resourcesDir = path.join(process.cwd(), 'resources');
const viewsDir = path.join(process.cwd(), 'src', 'views');

if (!fs.existsSync(viewsDir)) {
    fs.mkdirSync(viewsDir, { recursive: true });
}

function toPascalCase(str) {
    return str
        .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
        .replace(/^[a-z]/, m => m.toUpperCase());
}

function processHtml(html) {
    // Extract content inside <main> tag. If not found, look for <body>
    let content = html;
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
    if (mainMatch) {
        content = mainMatch[1];
    } else {
        // maybe no main? just extract body
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
        if (bodyMatch) content = bodyMatch[1];
    }

    // Remove Sidebar if it accidentally leaked into content
    content = content.replace(/<aside[\s\S]*?<\/aside>/g, '');

    content = content.replace(/class="/g, 'className="');
    content = content.replace(/for="/g, 'htmlFor="');
    content = content.replace(/tabindex="/g, 'tabIndex="');
    content = content.replace(/readonly/g, 'readOnly');
    content = content.replace(/disabled/g, 'disabled={true}'); // or 'disabled' is fine in jsx if true

    // Convert style="width: 50%" to style={{width: '50%'}}
    content = content.replace(/style="([^"]+)"/g, (match, styles) => {
        const props = styles.split(';').filter(Boolean).map(s => {
            let [key, val] = s.split(':').map(v => v.trim());
            if (!key) return '';
            // camelCase key
            key = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
            return `${key}: '${val}'`;
        }).join(', ');
        return `style={{ ${props} }}`;
    });

    // Self-close tags
    const voids = ['input', 'img', 'br', 'hr', 'path', 'svg', 'circle'];
    for (const tag of voids) {
        const regex = new RegExp(`<${tag}([^>]*?)(?<!/)>`, 'gi');
        content = content.replace(regex, `<${tag}$1 />`);
    }

    // Comments shouldn't break JSX, but let's change HTML comments to JSX comments
    content = content.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

    return `<>\n${content}\n</>`;
}

const folders = fs.readdirSync(resourcesDir).filter(f => fs.statSync(path.join(resourcesDir, f)).isDirectory());

const exports = [];

for (const folder of folders) {
    const htmlPath = path.join(resourcesDir, folder, 'code.html');
    if (fs.existsSync(htmlPath)) {
        let name = folder;
        name = name.replace(/_1$/, 'One').replace(/_2$/, 'Two').replace(/_3$/, 'Three');
        const componentName = toPascalCase(name);

        const html = fs.readFileSync(htmlPath, 'utf-8');
        const jsxContent = processHtml(html);

        const fileContent = `import React from 'react';\n\nexport default function ${componentName}() {\n  return (\n    ${jsxContent}\n  );\n}\n`;

        fs.writeFileSync(path.join(viewsDir, `${componentName}.tsx`), fileContent);
        exports.push(componentName);
        console.log(`Generated ${componentName}.tsx`);
    }
}

// Update App.tsx with imports
let appTsx = fs.readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf-8');

let imports = exports.map(e => `import ${e} from './views/${e}';`).join('\n');
// We need to inject these imports at the top
appTsx = imports + '\n' + appTsx;
fs.writeFileSync(path.join(process.cwd(), 'src', 'App.tsx'), appTsx);
