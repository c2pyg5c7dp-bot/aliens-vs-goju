const fs = require('fs');
const path = require('path');

const sourceBase = path.join(process.env.USERPROFILE, 'OneDrive\\Documents\\GitHub\\aliens-vs-goju\\animations\\Player\\animations');
const destBase = path.join(process.env.USERPROFILE, 'OneDrive\\Documents\\GitHub\\aliens-vs-goju\\animations\\tank\\animations');

let totalCopied = 0;
const dirReport = {};

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else if (src.toLowerCase().endsWith('.png')) {
    const parentDir = path.basename(path.dirname(src));
    if (!dirReport[parentDir]) {
      dirReport[parentDir] = 0;
    }
    
    fs.copyFileSync(src, dest);
    dirReport[parentDir]++;
    totalCopied++;
  }
}

console.log('Starting copy process...');
copyRecursive(sourceBase, destBase);

console.log('\nCopy operation completed!');
console.log(`\nTotal PNG files copied: ${totalCopied}`);
console.log('\nDetailed report:');
Object.entries(dirReport).forEach(([dir, count]) => {
  console.log(`  - ${count} PNG files copied to ${dir}`);
});

// Verify
let destCount = 0;
function countRecursive(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      countRecursive(fullPath);
    } else if (file.toLowerCase().endsWith('.png')) {
      destCount++;
    }
  });
}

countRecursive(destBase);
console.log(`\nVerification: ${destCount} files confirmed in destination`);

if (destCount === totalCopied) {
  console.log('✓ Verification successful - all files copied correctly!');
} else {
  console.log(`✗ Verification failed - expected ${totalCopied} but found ${destCount}`);
}
