
async function fetchConfig() {
    try {
        const res = await fetch('http://localhost:3000/api/public/config?type=all');
        const data = await res.json();
        console.log('--- API RESPONSE ---');
        console.log(JSON.stringify(data, null, 2));
        console.log('--- END ---');
    } catch (err) {
        console.error('Fetch failed:', err.message);
    }
}
fetchConfig();
