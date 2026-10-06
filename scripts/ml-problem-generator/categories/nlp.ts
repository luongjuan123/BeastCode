import { MLProblemDefinition } from "../types";
import { DeterministicRNG, makeTc, formatConstraints, f4 } from "../utils";

export const nlpProblems: MLProblemDefinition[] = [
	// 67. Alexandria Term Frequency TF-IDF
	{
		id: "alexandria-term-frequency-tf-idf",
		title: "Alexandria Term Frequency TF-IDF",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "nlp", "information-retrieval", "tf-idf"],
		description: "Compute smooth TF-IDF feature weights for N documents across a vocabulary of size V.",
		story: `<p>The digital preservation division of the <b>Alexandria Digital Archives</b> indexes millions of historical manuscripts. To rank search relevance, the engine computes <b>TF-IDF</b> (Term Frequency-Inverse Document Frequency) using scikit-learn standard smooth IDF formulation:
<ul>
  <li><code>TF(t, d) = count(t, d) / total_words(d)</code> (if <code>total_words(d) == 0</code>, <code>TF = 0</code>)</li>
  <li><code>DF(t) = number of documents where count(t, d) > 0</code></li>
  <li><code>IDF(t) = ln((1 + N) / (1 + DF(t))) + 1</code></li>
  <li><code>TFIDF(t, d) = TF(t, d) * IDF(t)</code></li>
</ul></p>`,
		task: "Given N documents and V vocabulary terms represented as term-frequency count vectors, compute the TF-IDF matrix.",
		inputFormat: `<p>The first line contains integers <code>N</code> (documents) and <code>V</code> (vocabulary size).</p>
<p>The next <code>N</code> lines each contain <code>V</code> non-negative integers representing word counts in document <code>i</code>.</p>`,
		outputFormat: `<p>Print <code>N</code> lines, each containing <code>V</code> TF-IDF values with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 50",
			"1 <= V <= 20",
			"0 <= count(t, d) <= 100"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(801);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n1 0\n1 1", "1.0000 0.0000\n0.5000 0.7027", true, "N=2, V=2. DF=[2, 1]. IDF=[1.0, 1.4055]."));

			const tfidf = (N: number, V: number, counts: number[][]): string[] => {
				const DF = new Array(V).fill(0);
				for (let v = 0; v < V; v++) {
					for (let i = 0; i < N; i++) {
						if (counts[i][v] > 0) DF[v]++;
					}
				}
				const IDF = DF.map((df) => Math.log((1 + N) / (1 + df)) + 1);

				const res: string[] = [];
				for (let i = 0; i < N; i++) {
					const totalWords = counts[i].reduce((a, b) => a + b, 0);
					const row: string[] = [];
					for (let v = 0; v < V; v++) {
						const tf = totalWords === 0 ? 0 : counts[i][v] / totalWords;
						row.push(f4(tf * IDF[v]));
					}
					res.push(row.join(" "));
				}
				return res;
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(2, 6);
				const V = rng.nextInt(2, 4);
				const counts = Array.from({ length: N }, () => {
					const r = rng.intArray(V, 0, 5);
					if (r.every((x) => x === 0)) r[0] = 1;
					return r;
				});

				const out = tfidf(N, V, counts);
				let inStr = `${N} ${V}\n` + counts.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, out.join("\n")));
			}

			return tcs;
		},
	},

	// 68. Corpus Bag-of-Words Vectorizer
	{
		id: "corpus-bag-of-words-vectorizer",
		title: "Corpus Bag-of-Words Vectorizer",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "nlp", "bag-of-words", "feature-extraction"],
		description: "Vectorize text documents into word count vectors matching a fixed vocabulary.",
		story: `<p>A legal document discovery pipeline at <b>LexTech Analytics</b> converts judicial opinions into numerical representations for document clustering. Given a fixed dictionary of vocabulary keywords, each document is encoded as a <b>Bag-of-Words (BoW)</b> vector counting the exact occurrences of each vocabulary word in the given document.</p>`,
		task: "Given a vocabulary list and N documents, output the N BoW count vectors matching the vocabulary order.",
		inputFormat: `<p>The first line contains integer <code>V</code> followed by <code>V</code> space-separated vocabulary words.</p>
<p>The second line contains integer <code>N</code> (number of documents).</p>
<p>The next <code>N</code> lines each contain space-separated lowercase words forming document <code>i</code>.</p>`,
		outputFormat: `<p>Print <code>N</code> lines, each containing <code>V</code> space-separated integer counts.</p>`,
		constraints: formatConstraints([
			"1 <= V <= 50",
			"1 <= N <= 50",
			"words contain lowercase English characters only"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(802);
			const tcs = [];

			tcs.push(makeTc(1, "3 machine learning code\n2\nmachine code machine\nlearning deep code", "2 0 1\n0 1 1", true, "Document 1 has machine:2, code:1."));
			tcs.push(makeTc(2, "2 apple banana\n2\norange grape\napple banana apple", "0 0\n2 1", true, "Unseen words ignored."));

			const wordPool = ["data", "model", "tree", "node", "graph", "vector", "loss", "rate", "layer", "agent"];

			for (let i = 3; i <= 100; i++) {
				const V = rng.nextInt(3, 6);
				const vocab = rng.shuffle(wordPool).slice(0, V);
				const N = rng.nextInt(2, 6);

				const docs: string[] = [];
				const counts: number[][] = [];

				for (let d = 0; d < N; d++) {
					const docLen = rng.nextInt(2, 8);
					const docWords: string[] = [];
					for (let w = 0; w < docLen; w++) {
						docWords.push(rng.choice(wordPool));
					}
					docs.push(docWords.join(" "));

					const row = vocab.map((vw) => docWords.filter((w) => w === vw).length);
					counts.push(row);
				}

				const inStr = `${V} ${vocab.join(" ")}\n${N}\n` + docs.join("\n");
				const outStr = counts.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, outStr));
			}

			return tcs;
		},
	},

	// 69. Lexicon N-gram Frequency Analyzer
	{
		id: "lexicon-ngram-frequency-analyzer",
		title: "Lexicon N-gram Frequency Analyzer",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "nlp", "ngrams", "language-models"],
		description: "Extract and count contiguous n-grams from a sequence of words in order of first appearance.",
		story: `<p>At <b>Scribe AI</b>, language model pre-training relies on statistical n-gram priors to detect repetitive patterns. Given a token sequence and integer <code>n</code>, an n-gram is any contiguous subsequence of <code>n</code> tokens. The system records the frequency count of each unique n-gram in the exact order that it first appears in the text.</p>`,
		task: "Given N tokens and integer n, output each unique n-gram and its frequency separated by a colon, in order of first appearance.",
		inputFormat: `<p>The first line contains integers <code>T</code> (total tokens) and <code>n</code> (n-gram length).</p>
<p>The second line contains <code>T</code> space-separated words.</p>`,
		outputFormat: `<p>Print each unique n-gram followed by <code>: count</code> on separate lines.</p>`,
		constraints: formatConstraints([
			"1 <= n <= T <= 100",
			"words contain lowercase English characters"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(803);
			const tcs = [];

			tcs.push(makeTc(1, "5 2\nto be or not to", "to be: 1\nbe or: 1\nor not: 1\nnot to: 1", true, "4 bigrams."));
			tcs.push(makeTc(2, "4 2\na b a b", "a b: 2\nb a: 1", true, "'a b' appears twice."));

			const words = ["the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog"];

			for (let i = 3; i <= 100; i++) {
				const T = rng.nextInt(4, 12);
				const n = rng.choice([2, 3]);
				const tokens = Array.from({ length: T }, () => rng.choice(words));

				const counts = new Map<string, number>();
				const order: string[] = [];

				for (let j = 0; j <= T - n; j++) {
					const gram = tokens.slice(j, j + n).join(" ");
					if (!counts.has(gram)) {
						counts.set(gram, 0);
						order.push(gram);
					}
					counts.set(gram, counts.get(gram)! + 1);
				}

				const outStr = order.map((g) => `${g}: ${counts.get(g)}`).join("\n");
				tcs.push(makeTc(i, `${T} ${n}\n${tokens.join(" ")}`, outStr));
			}

			return tcs;
		},
	},

	// 70. Machine Translation BLEU Score
	{
		id: "machine-translation-bleu-score",
		title: "Machine Translation BLEU Score",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "nlp", "evaluation-metrics", "bleu"],
		description: "Compute BLEU-1 precision, Brevity Penalty (BP), and BLEU-1 score for machine translation evaluation.",
		story: `<p>A machine translation benchmark at <b>Polyglot AI</b> evaluates translation quality against human reference sentences using <b>BLEU-1</b> (BiLingual Evaluation Understudy):
<ul>
  <li>Unigram precision: <code>p_1 = clipped_matches / candidate_len</code>, where each word in the candidate matches up to the maximum count it appears in the reference sentence.</li>
  <li>Brevity Penalty: <code>BP = exp(min(0, 1 - r / c))</code>, where <code>r</code> is reference length and <code>c</code> is candidate length.</li>
  <li>Overall score: <code>BLEU1 = BP * p_1</code>.</li>
</ul></p>`,
		task: "Given the candidate sentence and reference sentence, compute and print p_1, BP, and BLEU1.",
		inputFormat: `<p>The first line contains space-separated words of the candidate translation.</p>
<p>The second line contains space-separated words of the reference translation.</p>`,
		outputFormat: `<p>Print <code>p_1</code>, <code>BP</code>, and <code>BLEU1</code> space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= candidate_len, reference_len <= 100",
			"words are lowercase ASCII"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(804);
			const tcs = [];

			tcs.push(makeTc(1, "the the the\nthe cat is on the mat", "0.6667 0.3679 0.2453", true, "Candidate len=3, matches capped at 2. BP = exp(1 - 6/3) = exp(-1) = 0.3679."));
			tcs.push(makeTc(2, "the cat sat on mat\nthe cat sat on the mat", "1.0000 0.8465 0.8465", true, "5/5 match, c=5, r=6. BP = exp(1 - 6/5) = exp(-0.2) = 0.8465."));

			const calcBleu1 = (cand: string[], ref: string[]): string => {
				const refCounts = new Map<string, number>();
				for (const w of ref) refCounts.set(w, (refCounts.get(w) || 0) + 1);

				const candCounts = new Map<string, number>();
				for (const w of cand) candCounts.set(w, (candCounts.get(w) || 0) + 1);

				let matches = 0;
				for (const [w, count] of candCounts.entries()) {
					matches += Math.min(count, refCounts.get(w) || 0);
				}

				const c = cand.length;
				const r = ref.length;
				const p1 = matches / c;
				const bp = Math.exp(Math.min(0, 1 - r / c));
				const bleu1 = bp * p1;

				return `${f4(p1)} ${f4(bp)} ${f4(bleu1)}`;
			};

			const dict = ["the", "cat", "dog", "sun", "is", "bright", "in", "sky", "runs", "fast"];

			for (let i = 3; i <= 100; i++) {
				const cLen = rng.nextInt(3, 8);
				const rLen = rng.nextInt(3, 8);
				const cand = Array.from({ length: cLen }, () => rng.choice(dict));
				const ref = Array.from({ length: rLen }, () => rng.choice(dict));

				const out = calcBleu1(cand, ref);
				tcs.push(makeTc(i, `${cand.join(" ")}\n${ref.join(" ")}`, out));
			}

			return tcs;
		},
	},

	// 71. Byte-Pair Encoding Merge Step
	{
		id: "byte-pair-encoding-merge-step",
		title: "Byte-Pair Encoding Merge Step",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "nlp", "tokenization", "bpe"],
		description: "Find the most frequent adjacent pair in a sequence of subwords and merge them.",
		story: `<p>Tokenizers like GPT's tiktoken and SentencePiece use <b>Byte-Pair Encoding (BPE)</b> to compress character sequences into vocabulary subwords. In a single merge step:
<ol>
  <li>Count the frequencies of all adjacent pairs <code>(token[i], token[i+1])</code>.</li>
  <li>Identify the pair with the maximum frequency. If there is a tie, choose the pair whose first occurrence appeared earliest.</li>
  <li>Replace every non-overlapping occurrence of that pair with their concatenation.</li>
</ol></p>`,
		task: "Given N tokens, perform one BPE merge step and output the resulting token sequence.",
		inputFormat: `<p>The first line contains integer <code>N</code> (number of initial tokens).</p>
<p>The second line contains <code>N</code> space-separated tokens.</p>`,
		outputFormat: `<p>Print the merged token sequence space-separated.</p>`,
		constraints: formatConstraints([
			"2 <= N <= 100",
			"tokens are non-empty strings of lowercase letters"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(805);
			const tcs = [];

			tcs.push(makeTc(1, "5\nl o w e s t", "lo w e s t", true, "All pairs have count 1; earliest 'l o' merges into 'lo'."));
			tcs.push(makeTc(2, "6\na b c a b d", "ab c ab d", true, "'a b' appears twice, so it merges into 'ab'."));

			const bpeMerge = (tokens: string[]): string => {
				const pairCounts = new Map<string, number>();
				const pairFirstIdx = new Map<string, number>();

				for (let i = 0; i < tokens.length - 1; i++) {
					const pairKey = `${tokens[i]}###${tokens[i + 1]}`;
					pairCounts.set(pairKey, (pairCounts.get(pairKey) || 0) + 1);
					if (!pairFirstIdx.has(pairKey)) {
						pairFirstIdx.set(pairKey, i);
					}
				}

				let bestPair = "";
				let maxCount = -1;
				let bestIdx = Infinity;

				for (const [pair, count] of pairCounts.entries()) {
					const idx = pairFirstIdx.get(pair)!;
					if (count > maxCount || (count === maxCount && idx < bestIdx)) {
						maxCount = count;
						bestPair = pair;
						bestIdx = idx;
					}
				}

				const [p1, p2] = bestPair.split("###");
				const merged: string[] = [];
				let i = 0;
				while (i < tokens.length) {
					if (i < tokens.length - 1 && tokens[i] === p1 && tokens[i + 1] === p2) {
						merged.push(p1 + p2);
						i += 2;
					} else {
						merged.push(tokens[i]);
						i += 1;
					}
				}
				return merged.join(" ");
			};

			const chars = ["a", "b", "c", "d", "e", "f"];

			for (let i = 3; i <= 100; i++) {
				const N = rng.nextInt(4, 12);
				const tokens = Array.from({ length: N }, () => rng.choice(chars));
				const out = bpeMerge(tokens);
				tcs.push(makeTc(i, `${N}\n${tokens.join(" ")}`, out));
			}

			return tcs;
		},
	},

	// 72. Semantic Search BM25 Ranking
	{
		id: "semantic-search-bm25-ranking",
		title: "Semantic Search BM25 Ranking",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "nlp", "information-retrieval", "bm25"],
		description: "Compute Okapi BM25 relevance scores for N documents given a query term and document lengths.",
		story: `<p>At enterprise search platform <b>LucidIndex</b>, <b>Okapi BM25</b> scores document relevance against incoming keyword queries:
<code>IDF = ln((N - DF + 0.5) / (DF + 0.5) + 1)</code>
<code>Score(d) = IDF * (TF * (k1 + 1)) / (TF + k1 * (1 - b + b * (L_d / L_avg)))</code>
where <code>k1 = 1.5</code>, <code>b = 0.75</code>, <code>L_d</code> is the length of document <code>d</code>, and <code>L_avg = sum(L_d) / N</code>.</p>`,
		task: "Given N documents, each with length L_d and term frequency TF of the query term, compute BM25 scores for all N documents.",
		inputFormat: `<p>The first line contains integer <code>N</code>.</p>
<p>The next <code>N</code> lines each contain two integers: <code>L_d</code> (doc length) and <code>TF</code> (frequency of query term in doc).</p>`,
		outputFormat: `<p>Print the <code>N</code> BM25 scores space-separated with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= N <= 100",
			"1 <= L_d <= 1000",
			"0 <= TF <= L_d",
			"k1 = 1.5, b = 0.75"
		]),
		points: 150,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(806);
			const tcs = [];

			tcs.push(makeTc(1, "2\n10 2\n20 2", "0.6865 0.5986", true, "Shorter document receives higher BM25 boost."));

			const bm25 = (N: number, docs: [number, number][]): string => {
				const k1 = 1.5;
				const b = 0.75;
				const L_avg = docs.reduce((s, d) => s + d[0], 0) / N;
				const DF = docs.filter((d) => d[1] > 0).length;
				const IDF = Math.log((N - DF + 0.5) / (DF + 0.5) + 1);

				return docs.map(([L_d, TF]) => {
					if (TF === 0) return f4(0);
					const denom = TF + k1 * (1 - b + b * (L_d / L_avg));
					const score = IDF * ((TF * (k1 + 1)) / denom);
					return f4(score);
				}).join(" ");
			};

			for (let i = 2; i <= 100; i++) {
				const N = rng.nextInt(2, 8);
				const docs: [number, number][] = [];
				for (let d = 0; d < N; d++) {
					const L_d = rng.nextInt(10, 100);
					const TF = rng.nextInt(0, 5);
					docs.push([L_d, TF]);
				}
				if (docs.every((d) => d[1] === 0)) docs[0][1] = 2;

				const out = bm25(N, docs);
				let inStr = `${N}\n` + docs.map((d) => `${d[0]} ${d[1]}`).join("\n");
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 73. Word Embedding Cosine Analogy
	{
		id: "word-embedding-cosine-analogy",
		title: "Word Embedding Cosine Analogy",
		difficulty: "Medium",
		category: "machine-learning",
		tags: ["machine-learning", "nlp", "word-embeddings", "cosine-similarity"],
		description: "Solve vector analogy A : B :: C : ? by finding candidate vector closest to A - B + C.",
		story: `<p>In representation learning at <b>VectorSpace Inc</b>, word embeddings exhibit linear semantic relationships: <code>king - man + woman approx queen</code>. Given target analogy vector <code>v_target = v_A - v_B + v_C</code> in <code>R^D</code> and a candidate pool of <code>K</code> candidate vectors, find the candidate <code>k</code> that maximizes <b>Cosine Similarity</b>:
<code>cos_sim(v_target, v_k) = (v_target * v_k) / (||v_target|| * ||v_k||)</code>.</p>`,
		task: "Given D, vectors A, B, C, and K candidate vectors, output the 1-based index of the best matching candidate and the similarity score.",
		inputFormat: `<p>The first line contains integers <code>D</code> and <code>K</code>.</p>
<p>The next 3 lines each contain <code>D</code> real numbers for vectors <code>A</code>, <code>B</code>, and <code>C</code>.</p>
<p>The next <code>K</code> lines each contain <code>D</code> real numbers for the candidate vectors.</p>`,
		outputFormat: `<p>Print the 1-based candidate index and the maximum cosine similarity with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"2 <= D <= 10",
			"1 <= K <= 20",
			"||v|| > 0"
		]),
		points: 120,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(807);
			const tcs = [];

			tcs.push(makeTc(1, "2 2\n2 1\n1 1\n0 2\n1 2\n0 0.5", "1 1.0000", true, "Target = [2-1+0, 1-1+2] = [1, 2]. Candidate 1 is exact match."));

			const solveAnalogy = (D: number, K: number, A: number[], B: number[], C: number[], cands: number[][]): string => {
				const target = new Array(D).fill(0);
				for (let d = 0; d < D; d++) target[d] = A[d] - B[d] + C[d];

				const normT = Math.sqrt(target.reduce((s, v) => s + v * v, 0));

				let bestIdx = 1;
				let bestSim = -Infinity;

				for (let k = 0; k < K; k++) {
					const v = cands[k];
					const normV = Math.sqrt(v.reduce((s, val) => s + val * val, 0));
					let dot = 0;
					for (let d = 0; d < D; d++) dot += target[d] * v[d];
					const sim = normT * normV === 0 ? 0 : dot / (normT * normV);

					if (sim > bestSim) {
						bestSim = sim;
						bestIdx = k + 1;
					}
				}

				return `${bestIdx} ${f4(bestSim)}`;
			};

			for (let i = 2; i <= 100; i++) {
				const D = rng.nextInt(2, 4);
				const K = rng.nextInt(2, 5);
				const A = rng.floatArray(D, -5, 5, 2);
				const B = rng.floatArray(D, -5, 5, 2);
				const C = rng.floatArray(D, -5, 5, 2);
				const cands = Array.from({ length: K }, () => rng.floatArray(D, -5, 5, 2));
				// Ensure non-zero norms
				cands[0][0] += 3;

				const out = solveAnalogy(D, K, A, B, C, cands);
				let inStr = `${D} ${K}\n${A.join(" ")}\n${B.join(" ")}\n${C.join(" ")}\n` + cands.map((r) => r.join(" ")).join("\n");
				tcs.push(makeTc(i, inStr, out));
			}

			return tcs;
		},
	},

	// 74. Spam Filter Naive Bayes Log-Odds
	{
		id: "spam-filter-naive-bayes-log-odds",
		title: "Spam Filter Naive Bayes Log-Odds",
		difficulty: "Easy",
		category: "machine-learning",
		tags: ["machine-learning", "nlp", "naive-bayes", "log-odds"],
		description: "Compute token log-odds ratios to identify spam-indicative and ham-indicative words.",
		story: `<p>A high-speed email security appliance at <b>MailGuardian</b> uses token <b>Log-Odds Ratios</b> to highlight spam indicators:
<code>LogOdds(w) = ln(P(w | spam) / P(w | ham))</code>.
Words with positive log-odds indicate spam, while negative values indicate legitimate ham messages.</p>`,
		task: "Given V tokens and their conditional probabilities P(w|spam) and P(w|ham), output the token name and its log-odds ratio.",
		inputFormat: `<p>The first line contains integer <code>V</code>.</p>
<p>The next <code>V</code> lines each contain token name <code>w</code>, <code>P(w|spam)</code>, and <code>P(w|ham)</code>.</p>`,
		outputFormat: `<p>Print <code>V</code> lines, each containing <code>token log_odds</code> with 4 decimal places.</p>`,
		constraints: formatConstraints([
			"1 <= V <= 50",
			"0.0001 <= P <= 0.9999"
		]),
		points: 100,
		customCheckerType: "whitespace",
		customTimeoutMs: 15000,
		customMemoryLimitMb: 1024,
		executionProfile: "machine_learning",
		generateTestCases: () => {
			const rng = new DeterministicRNG(808);
			const tcs = [];

			tcs.push(makeTc(1, "2\nfree 0.8 0.1\nmeeting 0.05 0.5", "free 2.0794\nmeeting -2.3026", true, "ln(0.8/0.1)=2.0794, ln(0.05/0.5)=-2.3026."));

			const tokens = ["bonus", "urgent", "invoice", "schedule", "winner", "report", "discount", "project"];

			for (let i = 2; i <= 100; i++) {
				const V = rng.nextInt(2, 5);
				const chosen = rng.shuffle(tokens).slice(0, V);
				const lines: string[] = [];
				const outLines: string[] = [];

				for (const t of chosen) {
					const pSpam = parseFloat(rng.nextFloat(0.05, 0.95).toFixed(3));
					const pHam = parseFloat(rng.nextFloat(0.05, 0.95).toFixed(3));
					lines.push(`${t} ${pSpam} ${pHam}`);
					const logOdds = Math.log(pSpam / pHam);
					outLines.push(`${t} ${f4(logOdds)}`);
				}

				tcs.push(makeTc(i, `${V}\n${lines.join("\n")}`, outLines.join("\n")));
			}

			return tcs;
		},
	},
];
