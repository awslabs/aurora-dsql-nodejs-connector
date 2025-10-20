import { PoolConfig } from "pg";
import { AuroraDSQLConfig } from "./aurora-dsql-config";

type AuroraDSQLPoolConfig = AuroraDSQLConfig & PoolConfig;

export { AuroraDSQLPoolConfig };
