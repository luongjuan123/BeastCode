import fs from "fs";
import path from "path";

const categoriesDir = path.join(__dirname, "problem-generator/categories");
const files = fs.readdirSync(categoriesDir).filter((f) => f.endsWith(".ts"));

console.log("Calibrating test case generation sizes in category files...");

for (const file of files) {
	const filePath = path.join(categoriesDir, file);
	let content = fs.readFileSync(filePath, "utf-8");

	// Replace massive ranges:
	content = content.replace(/rng\.nextInt\(\s*5000\s*,\s*50000\s*\)/g, "rng.nextInt(60, 150)");
	content = content.replace(/rng\.nextInt\(\s*5000\s*,\s*30000\s*\)/g, "rng.nextInt(60, 150)");
	content = content.replace(/rng\.nextInt\(\s*5000\s*,\s*20000\s*\)/g, "rng.nextInt(50, 100)");
	content = content.replace(/rng\.nextInt\(\s*500\s*,\s*5000\s*\)/g, "rng.nextInt(20, 60)");
	content = content.replace(/rng\.nextInt\(\s*500\s*,\s*3000\s*\)/g, "rng.nextInt(30, 80)");
	content = content.replace(/rng\.nextInt\(\s*800\s*,\s*2500\s*\)/g, "rng.nextInt(50, 120)");
	content = content.replace(/rng\.nextInt\(\s*500\s*,\s*2000\s*\)/g, "rng.nextInt(40, 100)");
	content = content.replace(/rng\.nextInt\(\s*501\s*,\s*10000\s*\)/g, "rng.nextInt(50, 150)");
	content = content.replace(/rng\.nextInt\(\s*100\s*,\s*500\s*\)/g, "rng.nextInt(20, 60)");
	content = content.replace(/rng\.nextInt\(\s*10\s*,\s*1000\s*\)/g, "rng.nextInt(5, 50)");
	content = content.replace(/rng\.nextInt\(\s*1\s*,\s*1000\s*\)/g, "rng.nextInt(5, 50)");
	content = content.replace(/rng\.nextInt\(\s*3\s*,\s*1000\s*\)/g, "rng.nextInt(5, 50)");
	content = content.replace(/rng\.nextInt\(\s*5\s*,\s*1000\s*\)/g, "rng.nextInt(5, 50)");
	content = content.replace(/rng\.nextInt\(\s*10\s*,\s*500\s*\)/g, "rng.nextInt(5, 50)");
	content = content.replace(/rng\.nextInt\(\s*5\s*,\s*500\s*\)/g, "rng.nextInt(5, 50)");
	content = content.replace(/rng\.nextInt\(\s*2\s*,\s*500\s*\)/g, "rng.nextInt(5, 50)");
	content = content.replace(/rng\.nextInt\(\s*30\s*,\s*100\s*\)/g, "rng.nextInt(5, 15)");

	fs.writeFileSync(filePath, content, "utf-8");
	console.log(`Calibrated ${file}`);
}

console.log("Calibration complete!");
