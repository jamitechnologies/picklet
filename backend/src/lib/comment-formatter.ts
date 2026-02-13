export interface AnalysisResult {
    file: string;
    changes: string[]; // e.g. "Field removed: email"
    violations: string[]; // e.g. "Required field 'email' missing"
    errors?: string[]; // e.g. "Failed to parse SQL"
    severity: 'SAFE' | 'BREAKING';
}

export function formatPRComment(results: AnalysisResult[]): string {
    const breakingCount = results.filter(r => r.severity === 'BREAKING').length;
    const errorCount = results.filter(r => r.errors && r.errors.length > 0).length;
    const safeCount = results.length - breakingCount - errorCount;

    let icon = '✅';
    let status = 'No issues found';

    if (errorCount > 0) {
        icon = '🚨';
        status = `${errorCount} Processing Errors`;
    } else if (breakingCount > 0) {
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

            if (result.errors && result.errors.length > 0) {
                comment += `#### 🚨 Processing Errors\n`;
                result.errors.forEach(e => comment += `- ${e}\n`);
                comment += `\n> [!TIP]\n> Check for syntax errors in your SQL/YAML or ensure the file is accessible.\n\n`;
            }

            comment += `</details>\n\n`;
        }
    }

    comment += `---\n💡 **Need help?** [Troubleshooting Guide](https://docs.picket.dev/troubleshooting) • [Schema Rules](https://docs.picket.dev/rules)`;

    return comment;
}
