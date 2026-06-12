const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'frontend/src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('confirm(')) {
    // Add import
    if (!content.includes(`import { confirmAction }`)) {
      content = content.replace(/(import .* from 'react-hot-toast';)/, "$1\nimport { confirmAction } from '../utils/confirm';");
    }
    
    // Replace if (!confirm('...')) return; with if (!(await confirmAction('...'))) return;
    content = content.replace(/if\s*\(!confirm\((.*?)\)\)\s*return;/g, "if (!(await confirmAction($1))) return;");
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
