
import { learningService } from '../server/services/learning';

async function main() {
    console.log('Running AI Learning Loop...');
    try {
        const result = await learningService.processCompletedReports();
        console.log('Learning Loop Completed.');
        console.log('Results:', result);
    } catch (error) {
        console.error('Learning Loop Failed:', error);
        process.exit(1);
    }
}

main();
