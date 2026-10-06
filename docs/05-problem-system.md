# BeastCode Platform Technical Documentation
## Section 05: Problem Management & Grading System

### 5.1 Problem Model & Schemas

The grading system processes user submissions against problem test cases. Each problem document in the `problems` collection contains structure fields for execution configuration and validation specs:

```json
{
  "title": "Two Sum",
  "problemStatement": "Given an array of integers `nums` and an integer `target`...",
  "difficulty": "Easy",
  "points": 100,
  "constraints": "2 <= nums.length <= 10^4",
  "starterCode": "function twoSum(nums, target) {\n\t// Write code here\n}",
  "handlerFunction": "function handler(output, expected) { return output === expected; }",
  "starterFunctionName": "twoSum",
  "inputFormat": "First line: array size and items. Second line: target.",
  "outputFormat": "Array indices of the two numbers.",
  "examples": [
    {
      "inputText": "[2,7,11,15]\n9",
      "outputText": "[0,1]"
    }
  ],
  "customChecker": {
    "type": "exact",
    "epsilon": null,
    "scriptLanguage": null,
    "scriptCode": null
  }
}
```

---

### 5.2 Verdict Verification Engine (`checkVerdict`)

BeastCode supports four types of validation checkers to evaluate code correctness:

#### A. Exact Match (`exact`)
Matches stdout against expected values. It runs a clean function (`cleanOutput`) which:
1.  Strips trailing carriage returns (`\r`).
2.  Trims trailing whitespaces from each line.
3.  Removes trailing empty lines.
4.  Performs strict equality comparison (`===`).

#### B. Whitespace-Insensitive Match (`whitespace`)
Useful for formatting-insensitive tasks.
1.  Normalizes all consecutive whitespaces (tabs, newlines, multiple spaces) to a single space.
2.  Trims starting and ending spacing.
3.  Converts strings to lowercase.
4.  Compares results.

#### C. Floating Point Tolerance (`float_tolerance`)
Evaluates math tasks with precision offsets:
1.  Tokenizes both expected and actual output by split spacing.
2.  For each token pair:
    *   If both parse as float, computes absolute difference: `diff = Math.abs(actVal - expVal)`.
    *   If `diff > epsilon`, checks relative difference: `relDiff = diff / Math.max(1e-9, Math.abs(expVal))`.
    *   If both differences exceed `epsilon` (default: `1e-6`), evaluation fails.
    *   If tokens are text, checks for exact match.

#### D. Special Judge (`special_judge`)
For problems with multiple valid outputs (e.g., shortest path, graph coloring), the platform uses a Special Judge:
1.  **Temp File Allocation**: Creates temp files in the OS temp directory (`os.tmpdir()`):
    *   `sj_input_[id].txt`: Stdin passed to user code.
    *   `sj_expected_[id].txt`: Reference solution output.
    *   `sj_actual_[id].txt`: Stdout returned by user code.
    *   `sj_script_[id].[py/cpp]`: Checker script code.
2.  **Compilation & Execution**:
    *   **Python**: Spawns `python3` runner passing `[scriptPath, inputPath, expectedPath, actualPath]`.
    *   **C++**: Compiles script code using `g++ -O3 -o binary`, then spawns the compiled binary passing `[inputPath, expectedPath, actualPath]`.
3.  **Result Capture**: Executes checker with a 5000ms timeout. If it exits with status `0`, the test case passes. Non-zero exit codes signal a failures.
4.  **Resource Cleanup**: Clears all temp file descriptors synchronously to prevent memory leaks.

---

### 5.3 Gamification & Level Calculations

Solving problems yields Experience Points (XP) mapped in `src/utils/experienceConfig.ts`. 

#### A. Experience Weights
User scores are computed as:
$$\text{Score} = (E \times 1) + (M \times 3) + (H \times 7) + (\text{ML} \times 10) + (P \times 5) + (W \times 20)$$

Where:
*   $E, M, H, \text{ML}$ = Solved Counts of Easy, Medium, Hard, and ML problems.
*   $P$ = Contest Participation Count.
*   $W$ = Contest Wins (1st place finishes).

#### B. Progression Ranks
User profile tiers adjust automatically based on score milestones:

| Rank Name | Score Threshold | Accent Color | Hex Code |
| :--- | :--- | :--- | :--- |
| **Newbie** | 0 | Slate | `#94a3b8` |
| **Beginner** | 5 | Green | `#22c55e` |
| **Apprentice** | 15 | Teal | `#14b8a6` |
| **Intermediate**| 30 | Blue | `#3b82f6` |
| **Advanced** | 50 | Indigo | `#6366f1` |
| **Expert** | 85 | Purple | `#a855f7` |
| **Master** | 130 | Pink | `#ec4899` |
| **Grandmaster** | 190 | Red | `#ef4444` |
| **Legend** | 270 | Amber | `#f59e0b` |
| **Mythic** | 370 | Glow Pink | `#d946ef` |

Upon clearing a milestone, user files are updated with the corresponding rank title, and level-up emails/in-app announcements are dispatched.
