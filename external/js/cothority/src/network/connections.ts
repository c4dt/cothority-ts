import { Log } from "../log";

/**
 * A connection allows to send a message to one or more distant peer
 */
export interface IConnection {
    sendmsg(msg: Buffer|Uint8Array): Promise<void>;
    recvmsg(): Promise<Buffer>;
}

export class WebSocketConnection implements IConnection {
    private ws: WebSocket;
    private openned: Promise<void>;
    private received: Set<Promise<Buffer>>;

    constructor(path: string) {
        Log.lvl4(`WebSocketConnection: opening for ${path}`);
        this.ws = new WebSocket(path);
        this.ws.binaryType = "arraybuffer"; // to prevent the browser to use blob
        this.received = new Set();

        this.ws.onmessage = (msg: MessageEvent) => {
            Log.lvl4(`WebSocketConnection.ws.onmessage: got ${msg.data}`);
            this.received.add(new Promise((resolve, reject) => {
                Log.lvl4(`WebSocketConnection.ws.onmessage: resolving with ${msg.data}`);
                resolve(msg.data);
            }))
        }

        this.openned = new Promise((resolve, reject) => {
            this.ws.onopen = (_: any) => resolve();
        })
    }

    async sendmsg(msg: Buffer): Promise<void> {
        await this.openned;
        return new Promise((resolve, reject) => {
            Log.lvl4(`WebSocketConnection.sendmsg: sending ${msg} with ws in state ${this.ws.readyState}`);
            this.ws.send(msg);
            resolve();
        })
    }

    async recvmsg(): Promise<Buffer> {
        while (this.received.size == 0) {
            // TODO sync by hand, ugly, find a library having async collections
            await new Promise((resolve, reject) => setTimeout(resolve, 30))
        }

        Log.lvl4(`WebSocketConnection.recvmsg: getting from pool of size ${this.received.size}`);
        const ret = Promise.race(this.received);
        this.received.delete(ret);
        Log.lvl4(`WebSocketConnection.recvmsg: got ${ret}`);
        return ret;
    }
}

export class MultiConnections<T> {
    private connected: Map<T, IConnection>;
    private factory: (T) => IConnection;

    constructor(factory: (T) => IConnection) {
        this.connected = new Map();
        this.factory = factory;
    }

    private getConn(ident: T): IConnection {
        const found = this.connected.get(ident);
        if (found !== undefined) {
            return found;
        }

        const conn = this.factory(ident);
        this.connected.set(ident, conn);
        return conn;
    }

    async sendto(ident: T, msg: Buffer|Uint8Array): Promise<void> {
        await this.getConn(ident).sendmsg(msg);
    }

    async recvfrom(ident: T): Promise<Buffer> {
        return await this.getConn(ident).recvmsg();
    }
}
