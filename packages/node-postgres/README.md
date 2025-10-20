# Aurora DSQL node-postgres Connector

The Aurora DSQL node-postgres Connector is a Node.js connector built on [node-postgres](https://node-postgres.com/) 
that integrates IAM Authentication for connecting JavaScript/TypeScript applications to Amazon Aurora DSQL clusters.

The Aurora DSQL node-postgres Connector is designed as an authentication plugin that extends the functionality of the
node-postgres' Client and Pool to enable applications to authenticate with Amazon Aurora DSQL using IAM credentials.

## About the Connector

Amazon Aurora DSQL is a cloud-native distributed database with PostgreSQL compatibility. While it requires IAM authentication and time-bound tokens, traditional Node.js database drivers lack this built-in support.

The Aurora DSQL node-postgres Connector bridges this gap by implementing an authentication middleware that works seamlessly with node-postgres. This approach allows developers to maintain their existing node-postgres code while gaining secure IAM-based access to Aurora DSQL clusters through automated token management.


### Features

- **Automatic IAM Authentication** - Handles DSQL token generation and refresh
- **Built on node-postgres** - Leverages the popular PostgreSQL client for Node.js  
- **Region Auto-Discovery** - Extracts AWS region from DSQL cluster hostname
- **Full TypeScript Support** - Provides full type safety
- **Custom Credentials** - Support for custom AWS credential providers

## Quick start guide

### Requirements

- Node.js 20+
- AWS credentials configured (via AWS CLI, environment variables, or IAM roles)
- Access to an Aurora DSQL cluster


## Installation

- Temporary work around as connector is not yet published yet 
```bash
npm install <ROOT_DIR of the DsqlNodePostgresConnector> 
```

## Peer Dependencies

```bash
npm install @aws-sdk/credential-providers @aws-sdk/dsql-signer pg tsx
npm install --save-dev @types/pg
```

## Usage

## Setup TypeScript Env
- Make sure your typescript environment have the following settings 

```json
// package.json
{
   "type": "module",
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es6",
    "module": "ES2020",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```
- place the samples below into src/index.ts
- run with `tsx src/index.ts`

### Client Connection

```typescript
// src/index.ts
import { AuroraDSQLClient } from 'aurora-dsql-node-postgres-connector';

const client = new AuroraDSQLClient({
  host: '<CLUSTER_ENDPOINT>',
  user:'admin',
});

async function connectDB(): Promise<void> {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    // Example query
    const result = await client.query('SELECT NOW()');
    console.log('Current time:', result.rows[0].now);
    
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    await client.end();
  }
}

connectDB();

```

### Pool Connection

```typescript
// src/index.ts
import { AuroraDSQLPool } from 'aurora-dsql-node-postgres-connector';

const pool = new AuroraDSQLPool({
  host: '<CLUSTER_ENDPOINT>',
  user: 'admin',
  max: 3,
  idleTimeoutMillis: 60000,
});

async function runConcurrentQuery(queryId: number): Promise<void> {
  try {
    const result = await pool.query('SELECT NOW(), $1 as query_id, pg_sleep(2)', [queryId]);
    console.log(`Query ${queryId} completed: ${result.rows[0].now}`);
  } catch (err: any) {
    console.error(`Query ${queryId} failed:`, err.message);
  }
}

async function runFor5Minutes(): Promise<void> {
  const startTime = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  let batchCount = 0;

  console.log('Starting 5-minute concurrent pool test...');

  while (Date.now() - startTime < fiveMinutes) {
    batchCount++;
    
    // Run 3 concurrent queries every 15 seconds          
    const concurrentQueries = [
      runConcurrentQuery(batchCount * 10 + 1),
      runConcurrentQuery(batchCount * 10 + 2),
      runConcurrentQuery(batchCount * 10 + 3)
    ];

    await Promise.all(concurrentQueries);
    
    console.log(`Batch ${batchCount} completed. Pool stats:`, {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    });

    // Wait 15 seconds before next batch
    await new Promise(resolve => setTimeout(resolve, 15000));
  }

  console.log(`Test completed. Executed ${batchCount * 3} queries in ${batchCount} batches.`);
  await pool.end();
}

runFor5Minutes();
```

### Advanced Usage 
```typescript
// index.ts
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { AuroraDSQLClient } from 'aurora-dsql-node-postgres-connector';

const client = new AuroraDSQLClient({
  host: 'example.dsql.us-east-1.on.aws',
  user: 'admin',
  customCredentialsProvider: fromNodeProviderChain(), // Optionally provide custom credentials provider
});

await client.connect();
const result = await client.query('SELECT NOW()');
await client.end();

```

## Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `host` | `string` | Yes | DSQL cluster hostname |
| `username` | `string` | Yes | DSQL username |
| `database` | `string` | No | Database name |
| `region` | `string` | No | AWS region (auto-detected from hostname if not provided) |
| `port`  | `number` | No | Default to 5432 
| `customCredentialsProvider` |  `AwsCredentialIdentity / AwsCredentialIdentityProvider` | No | Custom AWS credentials provider |
| `profile` | `string` | No | The IAM profile name. Default to "default"
| `tokenDurationSecs` | `number` | No | Token expiration time in seconds |

All other parameters from [Client](https://node-postgres.com/apis/client) / [Pool](https://node-postgres.com/apis/pool) are supported. 

## License

Apache-2.0