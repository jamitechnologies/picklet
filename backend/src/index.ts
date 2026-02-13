import * as dotenv from 'dotenv';
// import express from 'express'; // Removed duplicate
import { pool } from './db'; // We will create this next
import { verifyWebhookSignature, githubApp } from './lib/github';
import { prQueue } from './lib/queue';

// Change default-import to a namespace import to fix the module declaration syntax
import express, { Request, Response } from 'express';

import * as Sentry from '@sentry/node';
import helmet from 'helmet';

dotenv.config();

const app = express();

// Security headers
app.use(helmet());

if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
            // enable HTTP calls tracing
            new Sentry.Integrations.Http({ tracing: true }),
            // enable Express.js middleware tracing
            new Sentry.Integrations.Express({ app }),
        ],
        tracesSampleRate: 1.0,
    });

    // RequestHandler creates a separate execution context using domains, so that every
    // transaction/span/breadcrumb is attached to its own Hub instance
    app.use(Sentry.Handlers.requestHandler());
    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());
}

const port = process.env.PORT || 3000;

// Middleware to capture raw body for signature verification
app.use(express.json({
    verify: (req: any, res: any, buf: any) => {
        req.rawBody = buf.toString();
    }
}));

// Extend Express Request type to include rawBody
declare module 'express-serve-static-core' {
    interface Request {
        rawBody?: string;
    }
}

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

app.post('/webhooks/github', async (req: Request, res: Response) => {
    const signature = req.headers['x-hub-signature-256'] as string;
    const event = req.headers['x-github-event'] as string;
    const id = req.headers['x-github-delivery'] as string;

    if (!verifyWebhookSignature((req.rawBody || '') as string, signature)) {
        res.status(401).send('Invalid signature');
        return;
    }

    console.log(`Received GitHub event: ${event} (id: ${id})`);

    // We only care about pull_request events for now
    if (event === 'pull_request') {
        const payload = req.body;
        const action = payload.action;

        if (['opened', 'synchronize', 'reopened'].includes(action)) {
            try {
                const jobData = {
                    installationId: payload.installation?.id,
                    repoName: payload.repository.full_name,
                    prNumber: payload.number,
                    headSha: payload.pull_request.head.sha,
                    baseSha: payload.pull_request.base.sha,
                    cloneUrl: payload.repository.clone_url
                };

                await prQueue.add('check-pr', jobData);
                console.log(`Enqueued job for PR #${payload.number}`);
            } catch (err: any) {
                console.error('Failed to enqueue job:', err);
                // We still fail gracefully to GitHub? Or return error?
                // Probably log distinct error but return 200 to acknowledge receipt if it's our infra issue 
                // but usually better to let GitHub retry if we are down.
                // For now, log and continue.
            }
        } else {
            console.log(`Ignoring action: ${action}`);
        }
    }

    res.status(200).send('Event received');
});

// The error handler must be before any other error middleware and after all controllers
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
