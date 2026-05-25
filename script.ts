import fs from 'fs';

const content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const changesStart = '{/* Top Changes Grid - Grouped into Guideline and Intermediate Comparison Cards */}';
const changesEnd = '{/* Division Dept Shares */}';
const targetEnd = '      </PrintPageWrapper>';

if (content.includes(changesStart) && content.includes(changesEnd) && content.includes(targetEnd)) {
  const p1 = content.split(changesStart);
  const p2 = p1[1].split(changesEnd);
  const p3 = p2[1].split(targetEnd);

  const newContent = p1[0] + changesEnd + p3[0] + '      ' + changesStart + p2[0] + targetEnd + p3[1];
  fs.writeFileSync('src/components/Dashboard.tsx', newContent);
  console.log('Swapped correctly');
} else {
  console.log('Could not find markers');
}
