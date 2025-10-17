import { ClientConfig } from "pg";
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@smithy/types";

interface AuroraDSQLConfig extends ClientConfig {
  profile?: string;
  region?: string;
  tokenDurationSecs?: number;
  customCredentialsProvider?: AwsCredentialIdentity | AwsCredentialIdentityProvider;
}

export { AuroraDSQLConfig };
