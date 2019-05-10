import { IConnection } from "./connections";

interface Encoder<T> {
	encode(_: T): Uint8Array;
}
interface Decoder<T> {
	decode(_: Uint8Array): T;
}

export default async function rpc<U,V>(conn: IConnection, msg: Encoder<U>, decoder: Decoder<V>): Promise<V> {
    await conn.sendmsg(msg.encode(msg).finish());
    return decoder(await conn.recvmsg());
}
