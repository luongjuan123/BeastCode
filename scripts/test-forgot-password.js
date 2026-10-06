const http = require("http");

function makeRequest(email) {
	return new Promise((resolve, reject) => {
		const data = JSON.stringify({ email });
		const req = http.request({
			hostname: "localhost",
			port: 3001,
			path: "/api/auth/forgot-password",
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Content-Length": data.length
			}
		}, (res) => {
			let body = "";
			res.on("data", (chunk) => body += chunk);
			res.on("end", () => {
				resolve({
					statusCode: res.statusCode,
					body: JSON.parse(body)
				});
			});
		});

		req.on("error", (err) => reject(err));
		req.write(data);
		req.end();
	});
}

async function run() {
	try {
		console.log("--- 1. Testing Password Reset with an existing email ---");
		// bomemebo6996@gmail.com might or might not be in the mock DB, but let's test any email
		const res1 = await makeRequest("bomemebo6996@gmail.com");
		console.log("Response 1:", res1);

		console.log("\n--- 2. Testing Rate Limiting (sending again immediately) ---");
		const res2 = await makeRequest("bomemebo6996@gmail.com");
		console.log("Response 2 (should be success but rate limited internally):", res2);

		console.log("\n--- 3. Testing with a non-existent email ---");
		const res3 = await makeRequest("doesnotexist@beastcode.codes");
		console.log("Response 3 (should be success to prevent enumeration):", res3);

		console.log("\n--- 4. Testing invalid email format ---");
		const res4 = await makeRequest("invalid-email");
		console.log("Response 4 (should be 400 Bad Request):", res4);

	} catch (err) {
		console.error("Test failed:", err);
	}
}

run();
