import { Client } from "pg";
import { AuroraDSQLConfig } from "./config/aurora-dsql-config";
import { AuroraDSQLUtil } from "./aurora-dsql-util";

class AuroraDSQLClient extends Client {
  private dsqlConfig?: AuroraDSQLConfig;

  constructor(config?: string | AuroraDSQLConfig) {
    if (config === undefined) {
      throw new Error("Configuration is required");
    }

    let dsqlConfig = AuroraDSQLUtil.validatePgConfig(config);
    super(dsqlConfig);

    if (dsqlConfig !== undefined && typeof dsqlConfig !== "string") {
      this.dsqlConfig = dsqlConfig;
    }
  }

  // TypeScript doesn't allow multiple declarations of the same function name hence the following declaration was used
  override async connect(callback?: (err: Error) => void) {
    if (this.dsqlConfig !== undefined) {
      try {
        this.password = await AuroraDSQLUtil.getDSQLToken(
          this.dsqlConfig.host!,
          this.dsqlConfig.user!,
          this.dsqlConfig.profile!,
          this.dsqlConfig.region!
        );
      } catch (error) {
        if (callback) {
          callback(error as Error);
          return;
        }
        throw error;
      }
    }
    if (callback) {
      return super.connect(callback);
    }
    return super.connect();
  }
}

export { AuroraDSQLClient };
