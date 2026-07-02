const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/**/*.astro');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Determine the page path based on the import statement
    const importRegex = /import\s+(\w+)\s+from\s+['"](?:\.\.\/)+react-pages\/(.+)['"];?/;
    const match = content.match(importRegex);
    
    if (match) {
        const componentName = match[1];
        let pagePath = match[2];
        
        // Remove the .jsx extension if present in the pagePath
        pagePath = pagePath.replace(/\.jsx$/, '');

        // Remove the import line
        content = content.replace(match[0] + '\n', '');
        
        // Replace component={...} with pagePath="..."
        const componentRegex = new RegExp(`component=\\{${componentName}\\}`);
        content = content.replace(componentRegex, `pagePath="${pagePath}"`);
        
        fs.writeFileSync(file, content);
        console.log(`Refactored ${file}`);
    }
});
