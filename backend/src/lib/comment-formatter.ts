export interface AnalysisResult {
    file: string;
    changes: string[]; // e.g. "Field removed: email"
    violations: string[]; // e.g. "Required field 'email' missing"
    severity: 'SAFE' | 'BREAKING';
}

export function formatPRComment(results: AnalysisResult[]): string {
    const breakingCount = results.filter(r => r.severity === 'BREAKING').length;
    const safeCount = results.length - breakingCount;

    let icon = '✅';
    let status = 'No issues found';

    if (breakingCount > 0) {
        icon = '❌';
        status = `${breakingCount} Breaking Changes`;
    } else if (safeCount > 0) {
        icon = '⚠️';
        status = `${safeCount} Safe Changes`;
    }

    let comment = `## 🛡️ Picket Schema Check\n\n`;
    comment += `### ${icon} Status: ${status}\n\n`;
    comment += `Summary: ${results.length} files analyzed.\n\n`;

    if (results.length > 0) {
        comment += `### Details\n\n`;
        for (const result of results) {
            const icon = result.severity === 'BREAKING' ? '❌' : '⚠️';
            comment += `<details>\n<summary>${icon} ${result.file} - ${result.severity}</summary>\n\n`;

            if (result.changes.length > 0) {
                comment += `#### Changes\n`;
                result.changes.forEach(c => comment += `- ${c}\n`);
                comment += `\n`;
            }

            if (result.violations.length > 0) {
                comment += `#### Contract Violations\n`;
                result.violations.forEach(v => comment += `- ${v}\n`);
                comment += `\n`;
            }

            comment += `</details>\n\n`;
        }
    }

    comment += `---\n💡 Need help? [View docs](https://docs.picket.dev)`;

    return comment;
}
