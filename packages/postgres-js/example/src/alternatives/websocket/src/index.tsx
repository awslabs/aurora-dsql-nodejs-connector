/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import {
  AuroraDSQLWsConfig,
  auroraDSQLWsPostgres,
} from "@aws/aurora-dsql-postgresjs-connector";
import { AwsCredentialIdentity } from "@aws-sdk/types";
import postgres from "postgres";

let sql: postgres.Sql<{}> | null;

const App: React.FC = () => {
  const [query, setQuery] = useState(`SELECT NOW();`);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    // For testing purposes only, DO NOT USE in a production environment
    // Users must retrieve the AwsCredentialIdentity through a secure API
    const simulateSecureGetCredentialsAPI = (): Promise<AwsCredentialIdentity> => {
      return new Promise((resolve) => {
        setTimeout(async () => {
          const stsClient = new STSClient({
            region: "us-east-1",
            credentials: {
              // For testing only, DO NOT store the IAM accessKeyId and secretAccessKey inside the JavaScript source code
              accessKeyId: "<TESTING_ACCESS_KEY_ID>",
              secretAccessKey: "<TESTING_SECRET_ACCESS_KEY>",
            },
          });

          // Use a role with access permissions that are scoped to data accessible by that user
          const response = await stsClient.send(
            new AssumeRoleCommand({
              RoleArn: "arn:aws:iam::YOUR_TEST_ACCOUNT_NUMBER:role/YOUR_TEST_ROLE",
              RoleSessionName: "sample_query_editor_react",
              DurationSeconds: 900, // 15 min in seconds
            })
          );

          // Returns temporary session token credentials
          if (response.Credentials) {
            try {
              resolve({
                // DO NOT use an IAM accessKeyId and secretAccessKey directly here 
                accessKeyId: response.Credentials.AccessKeyId!,
                secretAccessKey: response.Credentials.SecretAccessKey!,
                sessionToken: response.Credentials.SessionToken!,
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              setResult(`Error: ${errorMessage} `);
            }
          }
        }, 50);
      });
    };

    const registerConnection = async () => {
      try {
        const wsConfig: AuroraDSQLWsConfig<{}> = {
          host: "your-cluster.dsql.us-east-1.on.aws",
          database: "postgres",
          user: "non_admin_user",
          customCredentialsProvider: simulateSecureGetCredentialsAPI,
          tokenDurationSecs: 60, // 1 min in seconds
        };
        sql = auroraDSQLWsPostgres(wsConfig);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setResult(`Error: ${errorMessage} `);
      }
    };

    registerConnection();
  }, []);

  const executeQuery = async () => {
    setLoading(true);

    try {
      if (sql) {
        let result;
        result = await sql.unsafe(query);
        setResult(`We got: ${JSON.stringify(result, null, 2)} `);
      } else {
        throw new Error("Database connection not initialized");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResult(`Error: ${errorMessage} `);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div
        style={{ padding: "20px", fontFamily: "monospace" }}
      >
        <h1>
          Aurora DSQL Query Editor React Sample
        </h1>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your SQL query here..."
          style={{ width: "100%", height: "150px", marginBottom: "10px" }}
        />
        <button onClick={executeQuery} disabled={loading}>
          {loading ? "Executing..." : "Execute Query"}
        </button>
        <div style={{ marginTop: "20px" }}>
          <h3>Result:</h3>
          <pre
            style={{
              background: "#f5f5f5",
              padding: "10px",
              minHeight: "100px",
            }}
          >
            {result || "No results yet"}
          </pre>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);
