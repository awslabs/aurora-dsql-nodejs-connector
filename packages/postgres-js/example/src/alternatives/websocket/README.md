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

## IAM Setup 
### Create a connect only permission
1. CREATE a new permission with the following JSON:
```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "Statement1",
			"Effect": "Allow",
			"Action": [
				"dsql:DbConnect"
			],
			"Resource": "*"
		}
	]
}
```
This permission allows the user to connect only but doesn't allow cluster management (e.g. create/edit/delete clusters). 

2. Policy name: `query_editor_connect`
### Create IAM User
1. Create an IAM user `query_editor`
2. Permissions options: Select `Attach policies directly`
3. Look for `query_editor_connect` select the checkbox on the left and click next 
4. Create the user 
5. Go back to AWS Console > IAM > Users > select `query_editor`
6. Under Summary, click `Create access key`
7. Select `Local code`
8. Retrieve access key - ⚠️ For testing purposes only! Never store access and secret keys in JavaScript source code especially in a production environment. ⚠️ 

### Create Assume Role
1. Create Role 
2. Trusted entity type: Select `Custom trust policy` and use the following template
Replace `<account_number>` with your account number

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::<account_number>:user/query_editor"
            },
            "Action": "sts:AssumeRole",
            "Condition": {}
        }
    ]
}
```

3. Under Add permissions, look for `query_editor_connect` select the checkbox on the left and click next 
4. Role name: `query_editor_connect_role`
5. Go back to AWS Console > IAM > Roles > select `query_editor_connect_role`
6. Look for the ARN (e.g. arn:aws:iam::<account_number>:role/query_editor_connect_role)

### Register a new user and associate the IAM role 
1. Follow this guide [Authorizing database roles to connect to your cluster](https://docs.aws.amazon.com/aurora-dsql/latest/userguide/using-database-and-iam-roles.html#using-database-and-iam-roles-custom-database-roles) to create a new user `example` and associate your role arn from step 6 above 
2. After this setup, the user `example` is ready to connect

## Configuration

Update the following in `src/index.tsx`:

1. **Aurora DSQL endpoint:**
   ```typescript
   host: "your-cluster-endpoint.dsql.us-east-1.on.aws"
   ```

2. **IAM credentials** (for testing only):
   
   see step 8 of [Create IAM User](#create-iam-user)
   ```typescript
   accessKeyId: "<TESTING_ACCESS_KEY_ID>"
   secretAccessKey: "<TESTING_SECRET_ACCESS_KEY>"
   ```

3. **IAM Role ARN:**
  
   see step 6 of [Create Assume Role](#create-assume-role)
   ```typescript
   RoleArn: "arn:aws:iam::YOUR_TEST_ACCOUNT_NUMBER:role/YOUR_TEST_ROLE"
   ```

## Security Warning

⚠️ **IMPORTANT:** This sample includes IAM credentials directly in the source code for demonstration purposes only. 

**DO NOT use this approach in production.** Instead:
- Store credentials securely on a backend server
- Implement a secure API endpoint to retrieve temporary credentials
- Use AWS Cognito or similar authentication services
- Never expose IAM credentials in client-side code


## Installation

```bash
npm install
```

## Running the Application

**Development mode:**
```bash
npm run dev
```

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

### webpack.config.js

```javascript
resolve: {
  fallback: {
    "buffer": path.resolve(__dirname, 'node_modules/buffer/index.js'),
    "timers": path.resolve(__dirname, 'node_modules/timers-browserify/main.js'),
    "events": path.resolve(__dirname, 'node_modules/events/events.js'),
    "process/browser": path.resolve(__dirname, 'node_modules/process/browser.js'),
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
The above modules are replaced with browser equivalents or disabled. The perf_hooks module (Node.js high-resolution timer) requires an additional plugin.

```javascript
  new webpack.NormalModuleReplacementPlugin(
    /^perf_hooks$/,
    path.resolve(__dirname, 'webpack-perf-hooks.js')
  )
]
```

## License

This sample code is made available under the Apache-2.0 license. See the LICENSE file.
