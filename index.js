const os = require("os");
const fs = require("fs");
const http = require("http");

const methods = require("./methods");

class Zcash {
	constructor(conf) {
		if(conf.user && conf.pass) {
			this.auth = "Basic " + Buffer.from(conf.user + ":" + conf.pass).toString("base64");
		}
		
		this.host = conf.host || "localhost";
		this.port = conf.port || 8232;
	}
	
	static auto() {
		const lines = fs.readFileSync(os.homedir() + "/.zcash/zcash.conf", "utf8")
			.split("\n");
		
		lines.pop();
		
		const config = {};
		
		lines.forEach(line => {
			const split = line.split("=");
			const key = split.shift();
			config[key] = split.join("=");
		});
		
		return new Zcash({
			user: config.rpcuser,
			pass: config.rpcpassword
		});
	}
}

Object.keys(methods).forEach(method => {
	Zcash.prototype[method] = function() {
		if(typeof arguments[arguments.length - 1] != 'function') {
			throw new Error("Last argument should be function");
		}
		const params = [];
		let cb = arguments[arguments.length - 1];
		
		Object.keys(arguments).forEach((argKey, i) => {
			if(i < arguments.length - 1)
				params.push(arguments[argKey]);
		});
		
		const postData = JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: methods[method],
			params
		});
		
		const options = {
			hostname: this.host,
			port: this.port,
			method: "POST",
			headers: {
				"Accept": "application/json",
				"Content-Type": "application/json",
				"Content-Length": Buffer.byteLength(postData)
			}
		};
		
		if(this.auth) {
			options.headers.Authorization = this.auth;
		}
		
		const req = http.request(options, (res) => {
			let data = "";
			
			res.setEncoding("utf8");
			res.on("data", chunk => data += chunk);
			
			res.on("end", () => {
				let response;
				
				try {
					response = JSON.parse(data);
				} catch(error) {
					return cb(error);
				}
				
				if(response.error) {
					return cb(response.error);
				}
				
				cb(null, response.result);
			});
		});
		
		req.on("error", cb);
		
		req.write(postData);
		req.end();
	};
});

module.exports = Zcash;
