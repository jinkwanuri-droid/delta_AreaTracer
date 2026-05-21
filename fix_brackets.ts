import * as fs from 'fs';

const filePath = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// We target the mapping ending code in the BarChart
console.log('Resolving bracket mismatch in BarChart...');

// Let's find:
//   />
// );
// })  <-- missing }
// ...
// </BarChart>

const regex = /(\s*)\/>\r?\n\s*;\r?\n(\s*)\)\r?\n\s*<\/BarChart>/;

// Let's replace the map's close '})' with '})}' to properly close the JSX block.
// To do this dynamically and robustly:
const index = content.indexOf('isAnimationActive={false}');
if (index !== -1) {
  // Let's search from that point forward for '})' followed by blank lines and '</BarChart>'
  const targetSegment = content.substring(index, index + 500);
  // Match '})' followed by whitespace and '</BarChart>'
  const bracketMatch = targetSegment.match(/\)\s*\r?\n\s*<\/BarChart>/);
  if (bracketMatch) {
    const updatedSegment = targetSegment.replace(/\)\s*\r?\n\s*<\/BarChart>/, ')\n                  })}\n                  </BarChart>');
    content = content.substring(0, index) + updatedSegment + content.substring(index + 500);
    console.log('Successfully added the missing JSX closing bracket!');
  } else {
    // Let's do a regex replacement on the whole file
    console.log('Trying regex approach on the whole file...');
    // Find the BarChart map ending that has "})" instead of "})}" before "</BarChart>"
    const beforeLength = content.length;
    content = content.replace(/(\s*)\/\>\r?\n\s*\;\r?\n\s*\}\)\r?\n\s*\r?\n\s*<\/BarChart>/, "$1/>\n                      );\n                    })}\n                  </BarChart>");
    if (content.length !== beforeLength) {
      console.log('Regex matched and replaced successfully!');
    } else {
      // Direct replacement fallback
      console.log('Trying fallback exact text replace for BarChart ending...');
      
      // Let's locate the substring that looks exactly like line 911 to 915 and fix it
      const brokenEndingLF = "/>\n                      );\n                    })\n                           \n                  </BarChart>";
      const brokenEndingCRLF = "/>\r\n                      );\r\n                    })\r\n                           \r\n                  </BarChart>";
      
      const fixedEnding = "/>\n                      );\n                    })}\n                  </BarChart>";
      
      if (content.includes(brokenEndingLF)) {
        content = content.replace(brokenEndingLF, fixedEnding);
        console.log('LF ending replaced!');
      } else if (content.includes(brokenEndingCRLF)) {
        content = content.replace(brokenEndingCRLF, fixedEnding);
        console.log('CRLF ending replaced!');
      } else {
        // Simple search for BarChart close and repair
        console.log('Performing deep search for the specific broken bracket lines');
        // Let's just find the first occurrences of "isAnimationActive={false}" and change "})" to "})}" if followed by "</BarChart>"
        const regexDeep = /(\/>\r?\n\s*;\r?\n\s*\}\))\r?\n\s*<\/BarChart>/g;
        content = content.replace(regexDeep, "$1}\n                  </BarChart>");
        console.log('Deep search replacement done!');
      }
    }
  }
} else {
  console.log('Could not find isAnimationActive marker.');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Brackets repair complete!');
