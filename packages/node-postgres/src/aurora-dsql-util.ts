import { DsqlSigner } from "@aws-sdk/dsql-signer";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { AwsCredentialIdentity, AwsCredentialIdentityProvider } from "@smithy/types";
import { AuroraDSQLConfig } from "./config/aurora-dsql-config";
import { AuroraDSQLPoolConfig } from "./config/aurora-dsql-pool-config";
import { parse } from "pg-connection-string";

const ADMIN_USER = "admin";

export class AuroraDSQLUtil {
  public static parseRegion(host: string): string {
    if (!host) {
      throw new Error("Hostname is required to parse region");
    }

    const match = host.match(/\.dsql[^.]*\.([^.]+)\.on\.aws$/);
    if (match) {
      return match[1];
    }

    throw new Error(`Unable to parse region from hostname: ${host}`);
  }

  public static async getDSQLToken(
    host: string,
    user: string,
    profile: string,
    region: string,
    tokenDurationSecs?: number,
    customCredentialsProvider?: AwsCredentialIdentity | AwsCredentialIdentityProvider
  ): Promise<string> {
    let token: string;
    try {
      let credential: AwsCredentialIdentity | AwsCredentialIdentityProvider;

      if (customCredentialsProvider !== undefined) {
        credential = customCredentialsProvider;
      } else {
        credential = fromNodeProviderChain({ profile: profile });
      }

      const signer = new DsqlSigner({
        hostname: host,
        credentials: credential,
        region: region,
        expiresIn: tokenDurationSecs
      });

      if (user === ADMIN_USER) {
        token = await signer.getDbConnectAdminAuthToken();
      } else {
        token = await signer.getDbConnectAuthToken();
      }
    } catch (error) {
      throw new Error(`Failed to generate DSQL token: ${error}`);
    }

    if (!token || token.trim() === "") {
      throw new Error("Failed to retrieve DSQL token - token is empty");
    }
    return token;
  }

  public static validatePgConfig(config: string | AuroraDSQLConfig): AuroraDSQLConfig {
    let dsqlConfig: AuroraDSQLConfig;
    if (typeof config === "string") {
      dsqlConfig = parse(config) as AuroraDSQLConfig;
    } else {
      dsqlConfig = config;
    }

    if (!dsqlConfig.host) {
      throw new Error("Host is required");
    }

    if (!dsqlConfig.user) {
      throw new Error("User is required");
    }

    dsqlConfig = {
      port: 5432,
      region: dsqlConfig.region || AuroraDSQLUtil.parseRegion(dsqlConfig.host),
      database: "postgres",
      profile: process.env.AWS_PROFILE || "default",
      ssl: { rejectUnauthorized: true },
      ...dsqlConfig
    };
    return dsqlConfig;
  }
}
