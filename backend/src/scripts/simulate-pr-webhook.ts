import axios from 'axios';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'development';
const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}/webhooks/github`;

function signPayload(payload: any): string {
    const json = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    return 'sha256=' + hmac.update(json).digest('hex');
}

async function main() {
    const payload = {
        action: 'opened',
        number: 1, // PR #1
        pull_request: {
            number: 1,
            head: { sha: '887a347f44571ab53e877751b8413baacfa4071f' }, // Use a real SHA if possible
            base: { sha: 'master' }
        },
        repository: {
            full_name: 'jamitechnologies/picklet',
            clone_url: 'https://github.com/jamitechnologies/picklet.git',
            owner: { login: 'jamitechnologies' },
            name: 'picklet'
        },
        installation: { id: 109874572 }
    };

    const signature = signPayload(payload);

    console.log(`Sending webhook to ${URL}...`);
    try {
        const response = await axios.post(URL, payload, {
            headers: {
                'x-github-event': 'pull_request',
                'x-github-delivery': 'uuid-1234',
                'x-hub-signature-256': signature,
                'Content-Type': 'application/json'
            }
        });
        console.log(`✅ Success: ${response.status} ${response.data}`);
    } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${error.response.data}`);
        }
    }
}

main();
