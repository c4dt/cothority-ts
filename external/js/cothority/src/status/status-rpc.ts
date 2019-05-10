import { IConnection, WebSocketConnection } from "../network/connections";
import rpc from "../network/protobuf";
import { Roster } from "../network/proto";
import { status as proto } from "../protobuf/proto";


/**
 * RPC to talk with the status service of the conodes
 */
export default class StatusRPC {
    private conns: IConnection[];

    constructor(roster: Roster) {
        this.conns = roster.list.map(srvid =>
            new WebSocketConnection(srvid.getWebSocketAddress() + "/Status/Request")
        );
    }

    /**
     * Fetch the status of the server at the given index
     * @param index Index of the server identity
     * @returns a promise that resolves with the status response
     */
    async getStatus(index: number = 0): Promise<proto.Response> {
        if (index >= this.conns.length || index < 0) {
            throw new Error("Index out of bound for the roster");
        }

        return await rpc(this.conns[index], new proto.Request(), proto.Response);
    }
}
