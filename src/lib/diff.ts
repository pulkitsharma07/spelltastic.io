export interface TextDiff {
  type: "delete" | "insert" | "equal";
  text: string;
}

export function computeTextDiff(oldText: string, newText: string): TextDiff[] {
  // Step 1: Compute edit distance matrix with backtracking info
  const m = oldText.length;
  const n = newText.length;
  const dp: Array<
    Array<{ cost: number; operation: "equal" | "delete" | "insert" | null }>
  > = Array(m + 1)
    .fill(null)
    .map(() =>
      Array(n + 1)
        .fill(null)
        .map(() => ({ cost: 0, operation: null })),
    );

  // Initialize first row and column
  for (let i = 0; i <= m; i++) {
    dp[i][0] = { cost: i, operation: i === 0 ? null : "delete" };
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = { cost: j, operation: j === 0 ? null : "insert" };
  }

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldText[i - 1] === newText[j - 1]) {
        dp[i][j] = {
          cost: dp[i - 1][j - 1].cost,
          operation: "equal",
        };
      } else {
        const delCost = dp[i - 1][j].cost + 1;
        const insCost = dp[i][j - 1].cost + 1;
        const subCost = dp[i - 1][j - 1].cost + 1;

        if (delCost <= insCost && delCost <= subCost) {
          dp[i][j] = { cost: delCost, operation: "delete" };
        } else if (insCost <= delCost && insCost <= subCost) {
          dp[i][j] = { cost: insCost, operation: "insert" };
        } else {
          dp[i][j] = { cost: subCost, operation: "delete" };
          // We'll handle this as a delete followed by insert
        }
      }
    }
  }

  // Step 2: Backtrack to get the optimal sequence of operations
  const changes: TextDiff[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    const operation = dp[i][j].operation;

    if (operation === "equal") {
      changes.unshift({ type: "equal", text: oldText[i - 1] });
      i--;
      j--;
    } else if (operation === "delete") {
      changes.unshift({ type: "delete", text: oldText[i - 1] });
      i--;
    } else if (operation === "insert") {
      changes.unshift({ type: "insert", text: newText[j - 1] });
      j--;
    }
  }

  // Step 3: Merge consecutive operations of the same type
  const mergedChanges: TextDiff[] = [];
  let currentChange = changes[0];

  for (let i = 1; i < changes.length; i++) {
    if (changes[i].type === currentChange.type) {
      currentChange.text += changes[i].text;
    } else {
      mergedChanges.push(currentChange);
      currentChange = changes[i];
    }
  }
  if (currentChange) {
    mergedChanges.push(currentChange);
  }

  return mergedChanges;
}
