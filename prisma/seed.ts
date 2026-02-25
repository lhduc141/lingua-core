import { execSync } from 'child_process';
import path from 'path';

const seedsDir = path.join(__dirname, 'seeds');

console.log('🌱 Running seeds...');

execSync(`pnpm exec tsx ${seedsDir}/seed-passages-questions.ts`, { stdio: 'inherit' });
execSync(`pnpm exec tsx ${seedsDir}/assign-irt-parameters.ts`, { stdio: 'inherit' });

console.log('✅ Seeding complete');
