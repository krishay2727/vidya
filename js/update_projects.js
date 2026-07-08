const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.join(__dirname, '..');
const projectsJsonPath = path.join(rootDir, 'projects', 'projects.json');
const projectsIndex = JSON.parse(fs.readFileSync(projectsJsonPath, 'utf8'));

for (const projPath of projectsIndex.projects) {
  const filePath = path.join(rootDir, projPath);
  if (!fs.existsSync(filePath)) continue;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const file = path.basename(projPath);

  // Remove icon
  if (data.icon) {
    delete data.icon;
  }

  // Rename skills to guide and convert to a basic guide if needed
  if (data.skills) {
    data.guide = data.skills.map((s, i) => `Learn and apply ${s.toLowerCase()}`);
    delete data.skills;
  }

  // Ensure image is set to something valid, if not, use a default
  if (!data.image) {
    data.image = `projects/images/${data.id || 'default'}.jpg`;
  }

  // Add liveUrl to project 1 (Hexapod or similar) - actually let's use sketching-live-main for sketching
  if (data.id === 'hexapod' || file === 'hexapod.json') {
    data.liveUrl = 'projects/sketching-live-main/index.html';
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated ${file}`);
}
