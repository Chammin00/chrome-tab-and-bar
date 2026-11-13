const fs = require('fs');
const path = require('path');
const cat = require('../index folder/projects-catalog.js');

const now = Math.floor(Date.now() / 1000);

const resolvedProjects = cat.projects.map(p => {
  const orig = p.indexFile.split('/').join('\\');
  const catPath = path.join('G:\\My Drive\\Antigravity\\Projects\\index folder', p.categorizedRelative.split('/').join('\\'));
  const finalPath = fs.existsSync(orig) ? orig : catPath;
  const fileUrl = 'file:///' + finalPath.replace(/\\/g, '/').replace(/ /g, '%20');
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    categoryId: p.categoryId,
    tagClass: p.tagClass,
    desc: p.desc,
    type: p.type,
    stack: p.stack || [],
    filePath: finalPath,
    url: fileUrl,
    highlight: !!p.highlight
  };
});

// Group by category
const categoriesMap = {
  'Cybersecurity & IT': { name: '01 Cybersecurity & IT', items: [] },
  'Games & Simulation': { name: '02 Games & Simulation', items: [] },
  'AI & Agent Systems': { name: '03 AI & Agent Systems', items: [] },
  'Web Apps & Media': { name: '04 Web Apps & Media', items: [] },
  'Productivity & Finance': { name: '05 Productivity & Finance', items: [] }
};

resolvedProjects.forEach(p => {
  if (categoriesMap[p.category]) {
    categoriesMap[p.category].items.push(p);
  }
});

// Build HTML bookmarks file
let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}" PERSONAL_TOOLBAR_FOLDER="true">Antigravity Projects</H3>
    <DL><p>
        <DT><A HREF="file:///G:/My%20Drive/Antigravity/Projects/chrome%20tab%20and%20bar/index.html" ADD_DATE="${now}">Chrome Tab &amp; Bar Hub</A>
        <DT><A HREF="file:///G:/My%20Drive/Antigravity/Projects/index%20folder/index.html" ADD_DATE="${now}">Projects Index Hub</A>
        <DT><A HREF="file:///G:/My%20Drive/Antigravity/Projects/index%20folder/3d-gallery-studio.html" ADD_DATE="${now}">3D Art Gallery Studio</A>
        <DT><A HREF="file:///G:/My%20Drive/Antigravity/Projects/Choogle/index.html" ADD_DATE="${now}">Choogle Search Engine</A>
`;

for (const [catName, catData] of Object.entries(categoriesMap)) {
  html += `        <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">${catData.name}</H3>\n        <DL><p>\n`;
  catData.items.forEach(item => {
    const safeName = item.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html += `            <DT><A HREF="${item.url}" ADD_DATE="${now}">${safeName}</A>\n`;
  });
  html += `        </DL><p>\n`;
}

html += `    </DL><p>\n</DL><p>\n`;

// Write bookmarks html file
const bookmarksPath = path.join(__dirname, 'Antigravity_Index_Bookmarks.html');
fs.writeFileSync(bookmarksPath, html, 'utf8');
console.log('Generated Antigravity_Index_Bookmarks.html successfully at', bookmarksPath);

// Also copy to index folder for convenience
fs.writeFileSync(path.join('G:\\My Drive\\Antigravity\\Projects\\index folder', 'Antigravity_Index_Bookmarks.html'), html, 'utf8');

// Write projects-data.js
const dataJs = `/**
 * Antigravity Projects & Index Files Registry for Chrome Tab & Bar
 * Generated automatically - 42 projects across 5 categorized wings
 */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PROJECTS_DATA = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  return ${JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalCount: resolvedProjects.length,
    categories: Object.keys(categoriesMap).map(k => ({
      name: k,
      folderName: categoriesMap[k].name,
      count: categoriesMap[k].items.length
    })),
    projects: resolvedProjects
  }, null, 2)};
});
`;
fs.writeFileSync(path.join(__dirname, 'projects-data.js'), dataJs, 'utf8');
console.log('Generated projects-data.js successfully');
