import { MLProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4 } from "../utils";

export const rlProblems: MLProblemDefinition[] = [
	// 95. Mars Rover Gridworld Bellman Update
	{
		id: "mars-rover-gridworld-bellman-update",
		title: "Mars Rover Gridworld Bellman Update",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "reinforcement-learning", "bellman-equation", "value-iteration"],
		description: "Compute the Bellman optimality value V*(s) = max_a sum_{s'} P(s'|s,a)[R + gamma * V(s')].",
		story: `<p>An autonomous planetary rover on Mars at <b>AeroAstro Robotics</b> plans traversing paths over treacherous terrain modeled as a Markov Decision Process (MDP). At state <code>s</code> with discount factor <code>gamma</code>, the rover considers <code>A</code> distinct directional maneuvers. For each action <code>a</code>, environmental slippage leads to <code>K</code> possible outcomes with probability <code>P</code>, immediate reward <code>R</code>, and next-state value <code>V'</code>:
<code>Q(s, a) = sum_{k=1}^K P_k * (R_k + gamma * V'_k)</code>
<code>V*(s) = max_{a} Q(s, a)</code>.</p>`,
		task: "Given gamma, action count A, outcome count K, and transition dynamics, find the 1-based best action index and optimal state value V*(s).",
		inputFormat: `<p>The first line contains real number <code>gamma</code>, and integers <code>A</code> and <code>K</code>.</p>
<p>The next <code>A</code> lines each describe an action via <code>K</code> triplets of real numbers: <code>P R V'</code>.</p>`,
		outputFormat: `<p>Print the 1-based optimal action index and optimal value <code>V*(s)</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"0.0 <= gamma <= 1.0",
			"1 <= A <= 10",
			"1 <= K <= 5",
			"sum(P) = 1.0 for each action"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1201);
			const tcs = [];

			tcs.push(makeTc(1, "0.9 2 1\n1.0 10.0 5.0\n1.0 2.0 20.0", "2 20.0000", true, "Action 1: 10 + 0.9*5 = 14.5. Action 2: 2 + 0.9*20 = 20.0. Action 2 wins."));

			const solveBellman = (gamma: number, A: number, K: number, actions: number[][]): string => {
				let bestAction = 1;
				let maxQ = -Infinity;

				for (let a = 0; a < A; a++) {
					let q = 0;
					for (let k = 0; k < K; k++) {
						const p = actions[a][k * 3];
						const r = actions[a][k * 3 + 1];
						const vPrime = actions[a][k * 3 + 2];
						q += p * (r + gamma * vPrime);
					}
					if (q > maxQ) {
						maxQ = q;
						bestAction = a + 1;
					}
				}
				return `${bestAction} ${f4(maxQ)}`;
			};

			for (let i = 2; i <= 100; i++) {
				const gamma = parseFloat(rng.nextFloat(0.5, 0.99).toFixed(2));
				const A = rng.nextInt(2, 4);
				const K = rng.nextInt(1, 3);
				const actions: number[][] = [];

				for (let a = 0; a < A; a++) {
					const rawP = rng.floatArray(K, 0.1, 1.0, 2);
					const sumP = rawP.reduce((s, x) => s + x, 0);
					const row: number[] = [];
					for (let k = 0; k < K; k++) {
						const p = rawP[k] / sumP;
						const r = parseFloat(rng.nextFloat(-5, 10).toFixed(1));
						const v = parseFloat(rng.nextFloat(0, 50).toFixed(1));
						row.push(p, r, v);
					}
					actions.push(row);
				}

				const out = solveBellman(gamma, A, K, actions);
				let inStr = `${gamma} ${A} ${K}\n` + actions.map((r) => r.map((x) => x.toFixed(2)).join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 96. Lunar Lander Q-Learning Update
	{
		id: "lunar-lander-q-learning-update",
		title: "Lunar Lander Q-Learning Update",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "reinforcement-learning", "q-learning", "temporal-difference"],
		description: "Compute one Temporal Difference Q-learning update step.",
		story: `<p>A simulated guidance computer for lunar touchdown at <b>Orbital Dynamics</b> learns thrust control via <b>Q-Learning</b>. Upon transitioning from state <code>s</code> to <code>s'</code> via action <code>a</code> with immediate reward <code>r</code>, the Q-value updates via:
<code>Q_{new}(s, a) = Q(s, a) + alpha * [ r + gamma * max_{a'} Q(s', a') - Q(s, a) ]</code>
where <code>alpha</code> is the learning rate and <code>gamma</code> is the discount factor.</p>`,
		task: "Given current Q(s,a), alpha, r, gamma, action count A_next, and array Q(s', a'), output the updated Q-value.",
		inputFormat: `<p>The first line contains real numbers <code>Q_curr</code>, <code>alpha</code>, <code>r</code>, and <code>gamma</code>.</p>
<p>The second line contains integer <code>A_next</code> followed by <code>A_next</code> space-separated real numbers.</p>`,
		outputFormat: `<p>Print the updated Q-value with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"0.0 < alpha <= 1.0",
			"0.0 <= gamma <= 1.0",
			"1 <= A_next <= 10"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1202);
			const tcs = [];

			tcs.push(makeTc(1, "0.0 0.5 10.0 0.9\n3 2.0 5.0 1.0", "7.2500", true, "Target = 10 + 0.9*5 = 14.5. TD error = 14.5. Q_new = 0 + 0.5*14.5 = 7.25."));

			const qLearn = (qCurr: number, alpha: number, r: number, gamma: number, qNext: number[]): number => {
				const maxNext = Math.max(...qNext);
				const tdTarget = r + gamma * maxNext;
				return qCurr + alpha * (tdTarget - qCurr);
			};

			for (let i = 2; i <= 100; i++) {
				const qCurr = parseFloat(rng.nextFloat(-10, 10).toFixed(2));
				const alpha = parseFloat(rng.nextFloat(0.1, 0.9).toFixed(2));
				const r = parseFloat(rng.nextFloat(-5, 20).toFixed(1));
				const gamma = parseFloat(rng.nextFloat(0.8, 0.99).toFixed(2));
				const Anext = rng.nextInt(2, 5);
				const qNext = rng.floatArray(Anext, -10, 30, 2);

				const out = f4(qLearn(qCurr, alpha, r, gamma, qNext));
				const inStr = `${qCurr} ${alpha} ${r} ${gamma}\n${Anext} ${qNext.join(" ")}`;
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 97. Multi-Armed Bandit Epsilon-Greedy
	{
		id: "multi-armed-bandit-epsilon-greedy",
		title: "Multi-Armed Bandit Epsilon-Greedy",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "reinforcement-learning", "multi-armed-bandit", "epsilon-greedy"],
		description: "Select an arm using epsilon-greedy exploration and update its estimated value incrementally.",
		story: `<p>An automated A/B banner routing algorithm at <b>AdSurge</b> balances exploration and exploitation using the <b>Epsilon-Greedy</b> strategy:
<ul>
  <li>Given random draw <code>u in [0, 1)</code> and exploration threshold <code>eps</code>:</li>
  <li>If <code>u < eps</code>, explore predetermined random arm <code>k_rand</code>.</li>
  <li>Else, exploit greedy arm <code>arg max_k Q_k</code> (breaking ties by picking the smallest arm index).</li>
  <li>Upon pulling the selected arm and observing payoff <code>R</code>, update its statistics:
    <code>N_{arm} = N_{arm} + 1</code>
    <code>Q_{arm} = Q_{arm} + (1 / N_{arm}) * (R - Q_{arm})</code>
  </li>
</ul></p>`,
		task: "Determine the chosen arm (1-based), output its new count, and the updated Q-value array.",
		inputFormat: `<p>The first line contains integer <code>K</code>, real numbers <code>eps</code> and <code>u</code>, and integer <code>k_rand</code>.</p>
<p>The second line contains <code>K</code> real numbers representing current values <code>Q</code>.</p>
<p>The third line contains <code>K</code> integers representing counts <code>N</code>.</p>
<p>The fourth line contains real number <code>R</code> (observed reward).</p>`,
		outputFormat: `<p>Print the chosen 1-based arm index and its updated count space-separated on line 1.</p>
<p>Print the updated <code>Q</code> values on line 2 (4 decimals).</p>`,
		constraints: formatConstraints([
			"2 <= K <= 20",
			"0.0 <= eps, u <= 1.0",
			"1 <= k_rand <= K"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1203);
			const tcs = [];

			tcs.push(makeTc(1, "3 0.1 0.5 1\n2.0 4.0 1.0\n5 10 2\n10.0", "2 11\n2.0000 4.5455 1.0000", true, "u >= eps -> exploit arm 2. N_2 becomes 11. Q_2 = 4 + (10-4)/11 = 4.5455."));
			tcs.push(makeTc(2, "2 0.5 0.2 1\n5.0 10.0\n1 1\n0.0", "1 2\n2.5000 10.0000", true, "u < eps -> explore arm 1."));

			const stepBandit = (K: number, eps: number, u: number, kRand: number, Q: number[], N: number[], R: number): [string, string] => {
				let chosen = 1;
				if (u < eps) {
					chosen = kRand;
				} else {
					let maxQ = -Infinity;
					for (let k = 0; k < K; k++) {
						if (Q[k] > maxQ) {
							maxQ = Q[k];
							chosen = k + 1;
						}
					}
				}

				const idx = chosen - 1;
				N[idx]++;
				Q[idx] += (1 / N[idx]) * (R - Q[idx]);

				return [`${chosen} ${N[idx]}`, Q.map(f4).join(" ")];
			};

			for (let i = 3; i <= 100; i++) {
				const K = rng.nextInt(3, 6);
				const eps = parseFloat(rng.nextFloat(0.1, 0.3).toFixed(2));
				const u = parseFloat(rng.nextFloat(0.0, 1.0).toFixed(2));
				const kRand = rng.nextInt(1, K);
				const Q = rng.floatArray(K, 0, 10, 2);
				const N = rng.intArray(K, 1, 20);
				const R = parseFloat(rng.nextFloat(0, 15).toFixed(1));

				const [line1, line2] = stepBandit(K, eps, u, kRand, [...Q], [...N], R);
				const inStr = `${K} ${eps} ${u} ${kRand}\n${Q.join(" ")}\n${N.join(" ")}\n${R}`;
				tcs.push(makeTc(i, inStr, `${line1}\n${line2}`));
			}

			return tcs;
		},
	},

	// 98. Casino Upper Confidence Bound UCB1
	{
		id: "casino-upper-confidence-bound-ucb1",
		title: "Casino Upper Confidence Bound UCB1",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "reinforcement-learning", "multi-armed-bandit", "ucb1"],
		description: "Compute the UCB1 index for K arms: UCB_k = x_bar_k + c * sqrt(2 * ln(t) / n_k) and choose the best arm.",
		story: `<p>In clinical drug dose trials at <b>BioPharma AI</b>, treatment arms are selected using the <b>UCB1 (Upper Confidence Bound)</b> algorithm to maximize efficacy while minimizing patient risk. At total elapsed timestep <code>t</code>:
<code>UCB_k = x_bar_k + c * sqrt((2 * ln(t)) / n_k)</code>
where <code>x_bar_k</code> is the empirical mean payout and <code>n_k > 0</code> is the number of times arm <code>k</code> was pulled. The policy chooses the arm with the highest UCB score (breaking ties with the lowest arm index).</p>`,
		task: "Given K, t, confidence constant c, and pairs of (x_bar_k, n_k), output the 1-based winning arm index and its UCB value.",
		inputFormat: `<p>The first line contains integer <code>K</code>, integer <code>t</code>, and real number <code>c</code>.</p>
<p>The next <code>K</code> lines each contain <code>x_bar_k</code> and <code>n_k</code>.</p>`,
		outputFormat: `<p>Print the 1-based arm index and its maximum UCB score with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= K <= 50",
			"t >= K",
			"n_k >= 1",
			"c > 0.0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1204);
			const tcs = [];

			tcs.push(makeTc(1, "2 10 1.0\n0.5 5\n0.4 2", "2 1.9177", true, "Arm 1 UCB = 0.5 + sqrt(2ln(10)/5) = 1.4598. Arm 2 UCB = 0.4 + sqrt(2ln(10)/2) = 1.9177."));

			const solveUcb1 = (K: number, t: number, c: number, arms: [number, number][]): string => {
				let bestArm = 1;
				let maxUcb = -Infinity;

				const lnT = Math.log(t);
				for (let k = 0; k < K; k++) {
					const [xBar, n] = arms[k];
					const ucb = xBar + c * Math.sqrt((2 * lnT) / n);
					if (ucb > maxUcb) {
						maxUcb = ucb;
						bestArm = k + 1;
					}
				}
				return `${bestArm} ${f4(maxUcb)}`;
			};

			for (let i = 2; i <= 100; i++) {
				const K = rng.nextInt(2, 6);
				const t = rng.nextInt(20, 100);
				const c = parseFloat(rng.nextFloat(0.5, 2.0).toFixed(2));
				const arms: [number, number][] = [];

				for (let k = 0; k < K; k++) {
					const xBar = parseFloat(rng.nextFloat(0.1, 5.0).toFixed(2));
					const n = rng.nextInt(1, Math.floor(t / K) + 2);
					arms.push([xBar, n]);
				}

				const out = solveUcb1(K, t, c, arms);
				let inStr = `${K} ${t} ${c}\n` + arms.map((a) => `${a[0]} ${a[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 99. Subway Agent Policy Evaluation Iterative
	{
		id: "subway-agent-policy-evaluation-iterative",
		title: "Subway Agent Policy Evaluation Iterative",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "reinforcement-learning", "policy-evaluation", "dynamic-programming"],
		description: "Compute one synchronous sweep of iterative policy evaluation: V(s) = sum_a pi(a|s) [R(s,a) + gamma * sum_{s'} P V(s')].",
		story: `<p>A metro transit dispatch agent at <b>UrbanFlow</b> evaluates train hold timings across <code>S</code> transit stations under a fixed policy <code>pi</code>. Given discount factor <code>gamma</code> and current state values <code>V_0, ..., V_{S-1}</code>, one synchronous iteration updates each state:
<code>V_{new}(s) = sum_{a} pi(a|s) * [ R(s, a) + gamma * sum_{s'} P(s' | s, a) * V_{old}(s') ]</code>.</p>`,
		task: "Given S, gamma, current state values V, and precomputed expected transition expressions for each state, compute the updated state values V_{new}.",
		inputFormat: `<p>The first line contains integer <code>S</code> and real number <code>gamma</code>.</p>
<p>The second line contains <code>S</code> real numbers representing current values <code>V_{old}</code>.</p>
<p>The next <code>S</code> lines each describe a state: integer <code>A</code> (actions), followed by <code>A</code> pairs of <code>pi(a|s)</code> and expected return <code>[R(s,a) + gamma * sum P V(s')]</code>.</p>`,
		outputFormat: `<p>Print the <code>S</code> updated state values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= S <= 20",
			"0.0 <= gamma <= 1.0",
			"1 <= A <= 5"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1205);
			const tcs = [];

			tcs.push(makeTc(1, "2 0.9\n0 0\n2 0.5 5.0 0.5 10.0\n1 1.0 -2.0", "7.5000 -2.0000", true, "State 1: 0.5*5 + 0.5*10 = 7.5. State 2: 1.0*-2 = -2.0."));

			const evalPolicy = (S: number, states: [number, number][][]): string => {
				const nextV: number[] = [];
				for (let s = 0; s < S; s++) {
					let val = 0;
					for (const [prob, qVal] of states[s]) {
						val += prob * qVal;
					}
					nextV.push(val);
				}
				return nextV.map(f4).join(" ");
			};

			for (let i = 2; i <= 100; i++) {
				const S = rng.nextInt(2, 5);
				const gamma = parseFloat(rng.nextFloat(0.5, 0.95).toFixed(2));
				const Vcurr = rng.floatArray(S, -10, 20, 1);
				const states: [number, number][][] = [];

				for (let s = 0; s < S; s++) {
					const A = rng.nextInt(1, 3);
					const rawProb = rng.floatArray(A, 0.1, 1.0, 2);
					const sumP = rawProb.reduce((a, b) => a + b, 0);
					const row: [number, number][] = [];
					for (let a = 0; a < A; a++) {
						const prob = rawProb[a] / sumP;
						const qVal = parseFloat(rng.nextFloat(-10, 30).toFixed(2));
						row.push([prob, qVal]);
					}
					states.push(row);
				}

				const out = evalPolicy(S, states);
				let inStr = `${S} ${gamma}\n${Vcurr.join(" ")}\n` +
					states.map((st) => `${st.length} ` + st.map(([p, q]) => `${p.toFixed(2)} ${q.toFixed(2)}`).join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 100. Robot Arm Discounted Cumulative Return
	{
		id: "robot-arm-discounted-cumulative-return",
		title: "Robot Arm Discounted Cumulative Return",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "reinforcement-learning", "returns", "discounted-return"],
		description: "Compute trajectory returns-to-go G_t = sum_{k=0}^{T-1-t} gamma^k * R_{t+k+1} using backward recursion.",
		story: `<p>A high-precision assembly arm at <b>Apex Robotics</b> learns micromanipulation through Policy Gradient methods. Policy gradient estimators compute the <b>Discounted Return (Reward-To-Go)</b> <code>G_t</code> for each step <code>t in {0, ..., T-1}</code> across trajectory rewards <code>[R_1, ..., R_T]</code>:
<code>G_t = sum_{k=0}^{T-1-t} gamma^k * R_{t+k+1}</code>
Using efficient backward recursion: <code>G_{T-1} = R_T</code>, and <code>G_t = R_{t+1} + gamma * G_{t+1}</code> for <code>t = T-2, ..., 0</code>.</p>`,
		task: "Given trajectory length T, discount factor gamma, and T rewards, compute and print G_0, G_1, ..., G_{T-1}.",
		inputFormat: `<p>The first line contains integer <code>T</code> and real number <code>gamma</code>.</p>
<p>The second line contains <code>T</code> space-separated real numbers representing rewards <code>R_1, ..., R_T</code>.</p>`,
		outputFormat: `<p>Print the <code>T</code> discounted return values space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= T <= 100",
			"0.0 <= gamma <= 1.0"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(1206);
			const tcs = [];

			tcs.push(makeTc(1, "3 0.9\n1 1 1", "2.7100 1.9000 1.0000", true, "G_2 = 1. G_1 = 1 + 0.9*1 = 1.9. G_0 = 1 + 0.9*1.9 = 2.71."));

			const calcReturns = (T: number, gamma: number, R: number[]): string => {
				const G = new Array(T).fill(0);
				G[T - 1] = R[T - 1];
				for (let t = T - 2; t >= 0; t--) {
					G[t] = R[t] + gamma * G[t + 1];
				}
				return G.map(f4).join(" ");
			};

			for (let i = 2; i <= 100; i++) {
				const T = rng.nextInt(3, 12);
				const gamma = parseFloat(rng.nextFloat(0.8, 0.99).toFixed(2));
				const R = rng.floatArray(T, -5, 10, 1);

				const out = calcReturns(T, gamma, R);
				tcs.push(makeTc(i, `${T} ${gamma}\n${R.join(" ")}`, out));
			}

			return tcs;
		},
	},
];
