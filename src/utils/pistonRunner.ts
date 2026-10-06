export type SupportedLanguage = "javascript" | "python" | "cpp" | "java" | "c";

export interface TestCaseResult {
	passed: boolean;
	input: string;
	expected: string;
	actual: string;
	error?: string;
	runtime?: number;
	memory?: number;
}

export interface PistonResult {
	success: boolean;
	isCompileError?: boolean;
	passedCount?: number;
	totalCount?: number;
	testResults?: TestCaseResult[];
	failedCaseIndex?: number;
	input?: string;
	expected?: string;
	actual?: string;
	error?: string;
}

// Map of standard competitive programming starter templates for each language
const cpTemplates: Record<SupportedLanguage, string> = {
	javascript: `const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (!input) return;
    // Read input and print output here
    // Example: console.log(input);
}

solve();`,
	python: `import sys

def solve():
    # Read input and print output here
    # lines = sys.stdin.read().split()
    pass

if __name__ == '__main__':
    solve()`,
	cpp: `#include <iostream>
using namespace std;

int main() {
    // Read input and print output here
    // Example: int a; cin >> a; cout << a << endl;
    return 0;
}`,
	java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Read input and print output here
    }
}`,
	c: `#include <stdio.h>

int main() {
    // Read input and print output here
    return 0;
}`
};

export const starterCodes: Record<string, Record<SupportedLanguage, string>> = {
	"two-sum": cpTemplates,
	"reverse-linked-list": cpTemplates,
	"jump-game": cpTemplates,
	"valid-parentheses": cpTemplates,
	"search-a-2d-matrix": cpTemplates
};

export async function runPistonCode(
	problemId: string,
	userCode: string,
	language: SupportedLanguage,
	testcases: any[],
	isCustomInput?: boolean
): Promise<PistonResult> {
	try {
		const response = await fetch("/api/run", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				problemId,
				userCode,
				language,
				testcases,
				isCustomInput
			})
		});

		if (!response.ok) {
			return {
				success: false,
				error: `Local execution API returned status ${response.status}`
			};
		}

		const data = await response.json();
		return data;
	} catch (err: any) {
		console.error("Local runner error:", err);
		return {
			success: false,
			error: `Execution error: ${err.message}`
		};
	}
}
