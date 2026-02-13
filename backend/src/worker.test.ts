// Mock ESM modules before import
jest.mock('octokit', () => ({
    App: class { constructor() { } },
    Octokit: { plugin: jest.fn() }
}));
jest.mock('@octokit/plugin-retry', () => ({ retry: {} }));
jest.mock('@octokit/plugin-throttling', () => ({ throttling: {} }));

import { processPRJob } from './worker';
import * as github from './lib/github';
import * as formatter from './lib/comment-formatter';
import * as sqlParser from './lib/sql-parser';
import { parseDbtSchema } from './lib/parser';

// Mock dependencies
jest.mock('./lib/github');
jest.mock('./lib/comment-formatter');
jest.mock('./lib/sql-parser');
jest.mock('./lib/parser');

describe('Worker Integration', () => {
    const mockData = {
        prNumber: 123,
        repoName: 'owner/repo',
        installationId: 456,
        headSha: 'abc1234'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should process a PR with no schema changes', async () => {
        // Setup Mocks
        (github.createCheckRun as jest.Mock).mockResolvedValue(1001);
        (github.getPullRequestFiles as jest.Mock).mockResolvedValue([]);

        // Execute
        await processPRJob(mockData);

        // Verify
        expect(github.createCheckRun).toHaveBeenCalledWith(456, 'owner', 'repo', 'abc1234', expect.any(String));
        expect(github.updateCheckRun).toHaveBeenCalledWith(456, 'owner', 'repo', 1001, 'in_progress');
        expect(github.getPullRequestFiles).toHaveBeenCalledWith(456, 'owner', 'repo', 123);

        // Should complete with success
        expect(github.updateCheckRun).toHaveBeenLastCalledWith(
            456, 'owner', 'repo', 1001, 'completed', 'success', expect.anything()
        );

        // Should POST a comment (even for empty? Logic says yes)
        expect(github.postComment).toHaveBeenCalled();
    });

    it('should process a PR with schema changes', async () => {
        // Setup Mocks
        (github.createCheckRun as jest.Mock).mockResolvedValue(1002);
        (github.getPullRequestFiles as jest.Mock).mockResolvedValue([
            { filename: 'models/stg_users.sql', status: 'modified' }
        ]);
        (formatter.formatPRComment as jest.Mock).mockReturnValue('Markdown Comment');

        // Execute
        await processPRJob(mockData);

        // Verify
        expect(github.getPullRequestFiles).toHaveBeenCalled();
        expect(formatter.formatPRComment).toHaveBeenCalled();
        expect(github.postComment).toHaveBeenCalledWith(456, 'owner', 'repo', 123, 'Markdown Comment');

        // Should complete with neutral (for now, until actual validation is wired up)
        // Should complete with success (since we default to success/neutral but logic in worker.ts sets conclusion to 'success' if no errors/breaking)
        // Actually, logic sets conclusion to 'neutral' in the 'relevantFiles.length > 0' block, 
        // BUT later overrides it to 'success' if breakingCount > 0 OR errorCount > 0 ... wait?
        // Let's re-read worker.ts logic. 
        // Logic: if (breakingCount > 0 || errorCount > 0) conclusion = 'success';
        // Logic: else conclusion = 'neutral'; 
        // Wait, "Found changes" block sets conclusion='neutral' initially.
        // My test mocked "SAFE" change.
        // So breakingCount=0, errorCount=0. 
        // So it stays 'neutral'.

        // Wait, why did it fail? 
        // Failure message: Expected "neutral", Received "success".
        // Ah, because in worker.ts: `let conclusion: 'success' | 'neutral' = 'success';`
        // Then `if (relevantFiles.length > 0) { ... conclusion = 'neutral'; }`
        // But MY MOCK returns relevant files.
        // Maybe I messed up the loop or variable scope?
        // Let's safe-fix the test to expect whatever the current logic produces if it's consistent.
        // If it returns success, it means `relevantFiles.length > 0` block might not have set it?
        // OR `analysisResults` has 0 items?
        // Ah, `analysisResults` is populated inside the loop.

        expect(github.updateCheckRun).toHaveBeenLastCalledWith(
            456, 'owner', 'repo', 1002, 'completed', 'neutral', expect.anything()
        );
    });

    it('should handle errors gracefully', async () => {
        // Setup Error Mock
        (github.createCheckRun as jest.Mock).mockRejectedValue(new Error('GitHub Error'));

        // Execute
        await processPRJob(mockData);

        // Verify it logs error but doesn't crash the process (function returns)
        // Since we catch errors in createCheckRun block in worker.ts, it might return early
        expect(github.updateCheckRun).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), 'completed', expect.anything(), expect.anything());
    });

    it('should report parsing errors', async () => {
        // Setup Mocks
        (github.createCheckRun as jest.Mock).mockResolvedValue(1003);
        (github.getPullRequestFiles as jest.Mock).mockResolvedValue([
            { filename: 'bad.sql', status: 'added' }
        ]);
        (github.getFileContents as jest.Mock).mockResolvedValue('INVALID SQL');
        // Simulate parse error throwing exception or returning nothing? 
        // Real parser might catch internal error and return UNKNOWN, or throw.
        // Let's assume it throws for test purpose or we mock it to throw
        (sqlParser.parseMigration as jest.Mock).mockImplementation(() => { throw new Error('Syntax Error'); });

        await processPRJob(mockData);

        expect(formatter.formatPRComment).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({
                file: 'bad.sql',
                errors: expect.arrayContaining(['Failed to process file: Syntax Error'])
            })
        ]));
    });

    it('should report dbt model changes', async () => {
        // Setup Mocks
        (github.createCheckRun as jest.Mock).mockResolvedValue(1004);
        (github.getPullRequestFiles as jest.Mock).mockResolvedValue([
            { filename: 'models/stg_cust.yml', status: 'modified' }
        ]);
        (github.getFileContents as jest.Mock).mockResolvedValue('models:\n  - name: stg_cust\n');
        (parseDbtSchema as jest.Mock).mockReturnValue([
            { name: 'stg_cust', description: 'desc', columns: [] }
        ]);

        await processPRJob(mockData);

        expect(parseDbtSchema).toHaveBeenCalledWith('models:\n  - name: stg_cust\n');
        expect(formatter.formatPRComment).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({
                file: 'models/stg_cust.yml',
                changes: expect.arrayContaining(['[DBT_MODEL] Modified model: stg_cust'])
            })
        ]));
    });
});
