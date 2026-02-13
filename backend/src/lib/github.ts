import { App } from 'octokit';
import { Octokit } from 'octokit';
import { throttling } from '@octokit/plugin-throttling';
import { retry } from '@octokit/plugin-retry';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Define Custom Octokit with Plugins
const MyOctokit = Octokit.plugin(throttling, retry);

const APP_ID = process.env.GITHUB_APP_ID;
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

// Try to read key from file first to avoid env var newline issues
let PRIVATE_KEY = process.env.GITHUB_PRIVATE_KEY;
const keyPath = path.resolve(__dirname, '../../../picket-local-vivek.2026-02-13.private-key.pem');

if (fs.existsSync(keyPath)) {
    PRIVATE_KEY = fs.readFileSync(keyPath, 'utf8');
} else if (PRIVATE_KEY) {
    PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
}

if (!APP_ID || !PRIVATE_KEY || !WEBHOOK_SECRET) {
    console.warn('GitHub App credentials missing in .env');
}

export const githubApp = new App({
    appId: APP_ID || 'dummy-app-id',
    privateKey: PRIVATE_KEY || 'dummy-private-key',
    webhooks: {
        secret: WEBHOOK_SECRET || 'dummy-secret'
    },
    Octokit: MyOctokit,
    log: console, // Use console for logging
});

// Configure throttling in the Octokit constructor options if needed, 
// but App handles instantiation. We might need to pass options to getInstallationOctokit?
// Actually App passes options to the Octokit constructor.
// Let's rely on defaults or simple config if possible, 
// but 'throttling' requires 'onRateLimit' and 'onSecondaryRateLimit' callbacks.

// We need to override the `getInstallationOctokit` behavior or configure the App properly.
// The App constructor options for `Octokit` just defines the class. 
// We validly need to verify if we can pass throttling options.
// A simpler way is to just use the `getInstallationOctokit` and let it be, 
// but we want robust clients.

// Let's create a helper to get the client and ensure it has plugins enabled.
export async function getOctokit(installationId: number) {
    // The App class will use MyOctokit, but we need to ensure options are passed.
    // Ideally we pass them in the App constructor?
    // According to docs, we can pass `oauth: { clientId: ..., clientSecret: ... }` etc.
    // For throttling options, it's a bit tricky with `new App`.
    // Let's construct the client manually if App doesn't propagate options easily, 
    // OR just instantiate a new MyOctokit with the token we get.

    // Simplest approach: Use App to get token, then instantiate robust Octokit.
    const token = await githubApp.octokit.rest.apps.createInstallationAccessToken({
        installation_id: installationId
    });

    return new MyOctokit({
        auth: token.data.token,
        throttle: {
            onRateLimit: (retryAfter: any, options: any, octokit: any) => {
                octokit.log.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
                if (options.request.retryCount === 0) {
                    // only retries once
                    octokit.log.info(`Retrying after ${retryAfter} seconds!`);
                    return true;
                }
            },
            onSecondaryRateLimit: (retryAfter: any, options: any, octokit: any) => {
                octokit.log.warn(`SecondaryRateLimit detected for request ${options.method} ${options.url}`);
                return true;
            },
        }
    });
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!WEBHOOK_SECRET) return false;
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Helper Functions

export interface ChangedFile {
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
    raw_url?: string;
}

export async function getPullRequestFiles(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number
): Promise<ChangedFile[]> {
    const octokit = await getOctokit(installationId);

    // Use iterator for pagination
    const iterator = octokit.paginate.iterator(octokit.rest.pulls.listFiles, {
        owner,
        repo,
        pull_number: prNumber,
        per_page: 100,
    });

    const files: ChangedFile[] = [];

    for await (const { data: batch } of iterator) {
        for (const file of batch) {
            files.push({
                filename: file.filename,
                status: file.status as any,
                raw_url: file.raw_url
            });
        }
    }

    return files;
}

export async function getFileContents(
    installationId: number,
    owner: string,
    repo: string,
    path: string,
    ref?: string
): Promise<string | null> {
    const octokit = await getOctokit(installationId);
    try {
        const response = await octokit.rest.repos.getContent({
            owner,
            repo,
            path,
            ref
        });

        // If file, content is in 'content' field (base64)
        if (!Array.isArray(response.data) && (response.data as any).content) {
            const buffer = Buffer.from((response.data as any).content, 'base64');
            return buffer.toString('utf-8');
        }
        return null; // It's a directory or submodule
    } catch (error: any) {
        if (error.status === 404) return null;
        throw error;
    }
}

// Check Runs API

export async function createCheckRun(
    installationId: number,
    owner: string,
    repo: string,
    headSha: string,
    name: string
): Promise<number> {
    const octokit = await getOctokit(installationId);

    const response = await octokit.rest.checks.create({
        owner,
        repo,
        name,
        head_sha: headSha,
        status: 'queued',
        started_at: new Date().toISOString()
    });

    return response.data.id;
}

export interface CheckRunOutput {
    title: string;
    summary: string;
    text?: string;
    annotations?: Array<{
        path: string;
        start_line: number;
        end_line: number;
        annotation_level: 'notice' | 'warning' | 'failure';
        message: string;
        title?: string;
    }>;
}

export async function updateCheckRun(
    installationId: number,
    owner: string,
    repo: string,
    checkRunId: number,
    status: 'queued' | 'in_progress' | 'completed',
    conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | 'action_required',
    output?: CheckRunOutput
): Promise<void> {
    const octokit = await getOctokit(installationId);

    const params: any = {
        owner,
        repo,
        check_run_id: checkRunId,
        status
    };

    if (status === 'completed') {
        params.completed_at = new Date().toISOString();
        if (conclusion) {
            params.conclusion = conclusion;
        }
    }

    if (output) {
        params.output = output;
    }

    await octokit.rest.checks.update(params);
}

// PR Comment API

export async function postComment(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
    body: string
): Promise<void> {
    const octokit = await getOctokit(installationId);

    // 1. List existing comments to find the bot's comment
    const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
    });

    // Identifier for our bot's comment (could use a hidden HTML comment or just check the user type 'Bot' and maybe a specific header)
    // For simplicity, we assume if the comment starts with "## 🛡️ Picket Schema Check", it's ours.
    // Also, checking if user.type === 'Bot' helps.
    const botComment = comments.find((c: any) =>
        c.user?.type === 'Bot' &&
        c.body?.includes('## 🛡️ Picket Schema Check')
    );

    if (botComment) {
        // Update existing comment
        await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: botComment.id,
            body
        });
        console.log(`Updated comment ${botComment.id}`);
    } else {
        // Create new comment
        await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
            body
        });
        console.log(`Created new comment on PR #${prNumber}`);
    }
}
