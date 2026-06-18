const { invalidateCache } = require('./src/utils/cache.util');

async function test() {
    try {
        await invalidateCache('cache:/api/admin/stats*');
        console.log("Cache invalidated successfully");
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        process.exit();
    }
}
test();
