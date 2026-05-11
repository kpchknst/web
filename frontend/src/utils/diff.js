function lcsTable(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i += 1) {
        for (let j = 1; j <= n; j += 1) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp;
}

export default function diffLines(oldText, newText) {
    const a = String(oldText || '').split('\n');
    const b = String(newText || '').split('\n');
    const dp = lcsTable(a, b);
    const left = [];
    const right = [];
    let i = a.length;
    let j = b.length;
    while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
            left.unshift({ type: 'context', text: a[i - 1] });
            right.unshift({ type: 'context', text: b[j - 1] });
            i -= 1;
            j -= 1;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) {
            left.unshift({ type: 'del', text: a[i - 1] });
            right.unshift({ type: 'context', text: '' });
            i -= 1;
        } else {
            left.unshift({ type: 'context', text: '' });
            right.unshift({ type: 'add', text: b[j - 1] });
            j -= 1;
        }
    }
    while (i > 0) {
        left.unshift({ type: 'del', text: a[i - 1] });
        right.unshift({ type: 'context', text: '' });
        i -= 1;
    }
    while (j > 0) {
        left.unshift({ type: 'context', text: '' });
        right.unshift({ type: 'add', text: b[j - 1] });
        j -= 1;
    }
    return { left, right };
}
