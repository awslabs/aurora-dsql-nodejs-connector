/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventEmitter } from "events";
import { AuroraDSQLWsConfig } from "./client";
import { Mutex } from "async-mutex";

const PROTOCOL_VERSION = 196608; // Protocol version 3.0
const HEARTBEAT_TIMEOUT = 5_000; // 5 seconds

interface Query {
  buffer: Buffer | Uint8Array;
  numOfQueries: number;
  isHeartBeat: boolean;
}

type ReadyState = "closed" | "querying" | "open";

export class PostgresWs extends EventEmitter {
  private mutex = new Mutex();
  private mutexRelease: (() => void) | null = null;

  private config: AuroraDSQLWsConfig<{}>;
  private ws: WebSocket | null = null;
  private connected: boolean = false;
  public readyState: ReadyState = "closed";

  private heartBeatTimeout: NodeJS.Timeout | null = null;

  private pendingQueries: Query[] = [];

  // these parameters are referenced when an Error is thrown
  private host: string | undefined;
  private port: number | undefined;

  constructor(config: AuroraDSQLWsConfig<{}>) {
    super();
    this.config = config;
    this.host = config.host;
    this.port = config.port;
  }

  private sendStartup(): void {
    const params =
      [
        "user",
        // BaseOptions uses user but Options uses username 
        this.config.user || this.config.username,
        "database",
        this.config.database,
        "client_encoding",
        "UTF8",
      ].join("\0") + "\0\0";

    const length = 4 + 4 + params.length;
    const buf = new Uint8Array(length);
    const view = new DataView(buf.buffer);

    view.setInt32(0, length, false);
    view.setInt32(4, PROTOCOL_VERSION, false);

    const encoder = new TextEncoder();
    buf.set(encoder.encode(params), 8);
    if (this.ws) {
      this.ws.send(buf);
    } else {
      throw Error("Websocket is not initialized");
    }
  }

  onReadyForQuery() {
    if (this.pendingQueries.length > 0) {
      if (this.pendingQueries[0].numOfQueries > 0) {
        this.pendingQueries[0].numOfQueries--;
      }

      // remove the pendingQueries now that we received the reply only if the querycount is at 0
      if (this.pendingQueries[0].numOfQueries <= 0) {
        this.pendingQueries.shift();
        this.readyState = "open";
        this.releaseMutex();
        this.processQueue();
      }
    }
  }

  handleHeartBeatResponse(data: Uint8Array): boolean {
    if (this.pendingQueries.length === 0 || (this.pendingQueries.length > 0 && !this.pendingQueries[0].isHeartBeat)) return false;

    const messageType = String.fromCharCode(data[0]);

    if (messageType === "D") {
      const dataStr = new TextDecoder().decode(data.slice(5));
      // verify that it is from heartbeat
      if (dataStr.includes("1")) {
        clearTimeout(this.heartBeatTimeout!);
        this.heartBeatTimeout = null;
      }
    } else if (messageType === "Z") {
      this.onReadyForQuery();
    }

    return true;
  }

  async connect(): Promise<this> {
    const url = `wss://${this.config.host}:${this.config.port || 443}`;
    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.connected = true;
      this.sendStartup();
      this.readyState = "open";
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const data = new Uint8Array(event.data);

      if (this.handleHeartBeatResponse(data)) return;

      if (data.length > 0 && data[0] === "Z".charCodeAt(0)) {
        this.onReadyForQuery();
      }
      this.emit("data", Buffer.from(data));
    };

    this.ws.onerror = (event: Event) => {
      const msg = (event as ErrorEvent).message || "WebSocket error";
      this.emit("error", new Error(`${msg} ${this.host}:${this.port}`));
    };

    this.ws.onclose = () => {
      if (this.heartBeatTimeout) {
        clearTimeout(this.heartBeatTimeout);
        this.heartBeatTimeout = null;
      }

      this.releaseMutex();

      this.connected = false;
      this.readyState = "closed";
      this.ws = null;
      this.emit("close");
    };

    return this;
  }

  createQueryBuffer(sql: string): Uint8Array {
    const sqlBytes = new TextEncoder().encode(sql + "\0");
    const length = 4 + sqlBytes.length;
    const buf = new Uint8Array(1 + length);
    const view = new DataView(buf.buffer);

    buf[0] = "Q".charCodeAt(0);
    view.setInt32(1, length, false);
    buf.set(sqlBytes, 5);

    return buf;
  }

  write(data: Buffer | Uint8Array): boolean {
    if (!this.ws || !this.connected) {
      return false;
    }

    // Count queries in the buffer
    let queryCount = 0;
    let offset = 0;

    while (offset < data.length) {
      if (data[offset] === "Q".charCodeAt(0)) {
        queryCount++;

        // Read message length to skip to next message
        if (offset + 5 <= data.length) {
          const length = new DataView(data.buffer, data.byteOffset + offset + 1, 4).getInt32(0, false);
          offset += 1 + length;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (queryCount == 0) {
      this.ws.send(data);
      return true;
    }


    // if the buffer contains a query, send a heart beat first
    if (
      queryCount > 0 &&
      this.config.connectionCheck &&
      this.heartBeatTimeout === null // make sure no existing heart beat time out is overwritten
    ) {
      const buf = this.createQueryBuffer("select 1;");
      this.pendingQueries.push({ buffer: buf, numOfQueries: 1, isHeartBeat: true });
    }
    this.pendingQueries.push({ buffer: data, numOfQueries: queryCount, isHeartBeat: false });
    this.processQueue();

    return true;
  }

  private releaseMutex() {
    if (this.mutexRelease) {
      this.mutexRelease();
      this.mutexRelease = null;
    }
  }

  private async processQueue(): Promise<void> {
    if (
      this.mutexRelease ||
      this.readyState !== "open" ||
      this.pendingQueries.length === 0
    ) {
      return;
    }

    this.mutexRelease = await this.mutex.acquire();

    // it is possible that the pendingQueries is now empty 
    if (this.pendingQueries.length == 0) {
      this.releaseMutex();
      return;
    }

    const data = this.pendingQueries[0];

    if (data.numOfQueries == 0) {
      this.pendingQueries.shift();
    }



    if (data.buffer.length > 0 && data.buffer[0] === "Q".charCodeAt(0)) {
      this.readyState = "querying";
    }

    if (data.isHeartBeat) {
      this.heartBeatTimeout = setTimeout(() => {
        console.log("Heart beat timed out");
        if (this.ws) {
          this.ws.close(1000, "Heart beat timeout");
        }
      }, HEARTBEAT_TIMEOUT);
    }

    if (this.ws) {
      this.ws.send(data.buffer);
    } else {
      throw Error("Websocket is not initialized");
    }
  }

  end(): void {
    if (this.ws && this.readyState !== "closed") {
      this.ws.close();
    }
  }

  destroy(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  // Following functions needs to be defined as connection.js 
  // in postgres.js can call these functions but they will be no-op
  setKeepAlive(): this {
    return this;
  }

  resume(): this {
    return this;
  }

  pause(): this {
    return this;
  }

  cork(): this {
    return this;
  }

  uncork(): this {
    return this;
  }

}

export function createPostgresWs(
  config: AuroraDSQLWsConfig<{}>
): () => Promise<PostgresWs> {
  return async () => {
    const socket = new PostgresWs(config);

    await socket.connect();
    return socket;
  };
}
