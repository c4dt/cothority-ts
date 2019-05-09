import { IConnection, WebSocketConnection } from "../network/connections";
import * as proto from "../protobuf/proto";

/**
 * RPC to talk with the SafeAI service of the conodes
 */
export default class RPC {
    /** connection to given address */
    private conn: IConnection;

    /**
     * RPC with the given address
     * @param [addr] address to connect to
     */
    constructor(addr: string) {
        this.conn = new WebSocketConnection(addr + "/SafeAI/Templates");
    }

    /**
     * Fetch the availables templates
     * @returns Promise resolving with the list of templates
     */
    async getTemplates(): Promise<string[]> {
        await this.conn.sendmsg(proto.GetTemplates.encode(new proto.GetTemplates()).finish());
        return proto.GotTemplates.decode(await this.conn.recvmsg()).templates;
    }
}
