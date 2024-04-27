import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

// inicializar
const app = express();

// Middleware setup
app.use(cors()); // Enable CORS
app.use(helmet()); // Add security headers
app.use(morgan("combined")); // Log HTTP request
app.disable("x-powered-by"); // Hide express server information

// Services routes
const service = [
  { route: "/auth", target: "testurl.com" },
  { route: "/users", target: "testurl.com" },
  { route: "/chats", target: "testurl.com" },
  { route: "/payments", target: "testurl.com" },
  // add more services as needed either deployed or locally
];

// define rate limit constants
const rateLimit = 20; //Max request per minute
const interval = 60 * 1000; // Time window in milliseconds (1 min)

// object to store request counts for each ip address
const requestCounts = {};

console.log(requestCounts);

// Reset request count for each IP address every 'interval' milliseconds
setInterval(() => {
  Object.keys(requestCounts).forEach((ip) => {
    requestCounts[ip] = 0; // reset request count for each IP address
  });
}, interval);

// Middleware function for rate limiting and timeout handling
function rateLimitAndTimeout(req, res, next) {
  const ip = req.ip; // Get client IP address

  // Update request count for the current IP
  requestCounts[ip] = (requestCounts[ip] || 0) + 1;

  // Check if request count exceeds the rate limit
  if (requestCounts[ip] > rateLimit) {
    // Respond with a 429 Too Many Requests status code
    return res.status(429).json({
      code: 429,
      status: "Error",
      message: "Rate limit exceeded.",
      data: null,
    });
  }

  // Set timeout for each request (example: 10 seconds)
  req.setTimeout(15000, () => {
    // Handle timeout error
    res.status(504).json({
      code: 504,
      status: "Error",
      message: "Gateway timeout.",
      data: null,
    });
    req.abort(); // Abort the request
  });

  next(); // Continue to the next middleware
}

// Apply the rate limit and timeout middleware to the proxy
app.use(rateLimitAndTimeout);

// Setup proxy middleware for each microservice
service.forEach((route, target) => {
  // Proxy options
  const proxyOptions = {
    target: "http://www.example.org",
    changeOrigin: true,
    pathRewrite: {
      [`^${route}`]: "",
    },
  };
  // Apply rate limiting and timeout middleware before proxying
  app.use(route, rateLimitAndTimeout, createProxyMiddleware(proxyOptions));
});

// handle for route-note-found
app.use((_req, res) => {
  res.status().json({
    code: 404,
    status: "Error",
    message: "Route not found",
    data: null,
  });
});

const PORT = process.env.PORT || 5000;

// Start express

app.listen(PORT, () => {
  console.log(`Gateway is running on port ${PORT}`);
});
