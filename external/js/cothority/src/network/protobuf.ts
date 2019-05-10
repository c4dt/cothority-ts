import { IConnection } from "./connections";

export default async function rpc<U,V>(conn: IConnection, msg: { encode: U => Uint8Array }, decoder: { decode: Uint8Array => V }: Promise<V> {
    await conn.sendmsg(msg.encode(msg).finish());
    return decoder(await conn.recvmsg());
}
