const fs = require('fs');
const path = require('path');

const projectsDir = path.join(__dirname, 'projects');
const files = fs.readdirSync(projectsDir).filter(f => f.match(/^[0-9]+project\.json$/));

for (const file of files) {
  const filePath = path.join(projectsDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

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
  if (data.id === 'hexapod' || file === '1project.json') {
    data.liveUrl = 'projects/sketching-live-main/index.html';
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated ${file}`);
}
