# Aurora DSQL Postgres.js React Sample

A React-based web application demonstrating how to connect to Amazon Aurora DSQL using the postgres.js connector in a browser environment.

## Features

- Browser-based SQL query execution
- WebSocket connection to Aurora DSQL
- React UI with query editor
- Real-time query results display

## Prerequisites

- Node.js 16+ and npm
- An Aurora DSQL cluster
- AWS credentials with appropriate IAM permissions
- IAM role for Aurora DSQL access

## Installation

```bash
npm install
```

## Configuration

Update the following in `src/index.tsx`:

1. **Aurora DSQL endpoint:**
   ```typescript
   host: "your-cluster-endpoint.dsql.us-east-1.on.aws"
   ```

2. **IAM credentials** (for testing only):
   ```typescript
   accessKeyId: "<TESTING_ACCESS_KEY_ID>"
   secretAccessKey: "<TESTING_SECRET_ACCESS_KEY>"
   ```

3. **IAM Role ARN:**
   ```typescript
   RoleArn: "arn:aws:iam::YOUR_TEST_ACCOUNT_NUMBER:role/YOUR_TEST_ROLE"
   ```

## Running the Application

**Development mode:**
```bash
npm run dev
```

## Security Warning

⚠️ **IMPORTANT:** This sample includes IAM credentials directly in the source code for demonstration purposes only. 

**DO NOT use this approach in production.** Instead:
- Store credentials securely on a backend server
- Implement a secure API endpoint to retrieve temporary credentials
- Use AWS Cognito or similar authentication services
- Never expose IAM credentials in client-side code

## Usage

1. Start the development server
2. Open http://localhost:3000 in your browser
3. Enter a SQL query in the textarea
4. Click "Execute Query" to run the query
5. View results in the output panel

## Project Structure

```
├── src/
│   └── index.tsx          # Main React application
├── public/
│   └── index.html         # HTML template
├── webpack.config.js      # Webpack configuration
├── webpack-perf-hooks.js  # Browser polyfill for Node.js perf_hooks
└── package.json           # Dependencies
```
## Browser Compatibility Configuration

Since postgres.js is designed for Node.js, several webpack configurations are required for browser compatibility:

### Polyfills Required

```javascript
resolve: {
  fallback: {
    "buffer": require.resolve("buffer/"),
    "timers": require.resolve("timers-browserify"),
    "events": require.resolve("events/"),
    "stream": false,
    "crypto": false,
    "fs": false,
    "path": false,
    "os": false,
    "tls": false,
    "net": false
  }
}
```

### Node.js Globals

```javascript
plugins: [
  new webpack.ProvidePlugin({
    Buffer: ['buffer', 'Buffer'],
    process: 'process/browser',
    setImmediate: ['timers', 'setImmediate']
  })
]
```

### Performance Hooks Replacement

Create `webpack-perf-hooks.js` to replace Node.js `perf_hooks` with browser's `performance` API:

```javascript
module.exports = {
  performance: {
    now: Date.now
  }
};
```

Then add to webpack config:

```javascript
new webpack.NormalModuleReplacementPlugin(
  /^perf_hooks$/,
  path.resolve(__dirname, 'webpack-perf-hooks.js')
)
```
## License

This sample code is made available under the Apache-2.0 license. See the LICENSE file.
