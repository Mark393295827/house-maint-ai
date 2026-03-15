import { fileURLToPath } from 'url';
console.log('process.argv[1]:', process.argv[1]);
console.log('import.meta.url:', import.meta.url);
console.log('fileURLToPath(import.meta.url):', fileURLToPath(import.meta.url));
console.log('Match:', process.argv[1] === fileURLToPath(import.meta.url));
