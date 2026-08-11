import db from '../config/db';

async function checkFormats() {
    try {
        const runs = await db.all("SELECT run FROM students");
        const specialRuns = runs.filter(r => r.run.includes('.') || r.run.toLowerCase().includes('k') || !r.run.includes('-'));
        console.log("Total runs checked:", runs.length);
        console.log("Special formatted runs (dots, 'k', no hyphen):", specialRuns.slice(0, 15));
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}
checkFormats();
