import ByzCoinRPC from "../../src/byzcoin/byzcoin-rpc";
import DarcInstance, { newDarc } from "../../src/byzcoin/contracts/darc-instance";
import IdentityDarc from "../../src/darc/identity-darc";
import Rules from "../../src/darc/rules";
import SignerEd25519 from "../../src/darc/signer-ed25519";
import { BLOCK_INTERVAL, ROSTER, SIGNER, startConodes } from "../support/conondes";

describe("DarcInstance Tests", () => {
    const roster = ROSTER.slice(0, 4);

    beforeAll(async () => {
        await startConodes();
    });

    it("should find related rule", async () => {
        const darc = ByzCoinRPC.makeGenesisDarc([SIGNER], roster);
        darc.addIdentity("spawn:darc", SIGNER, Rules.OR);
        const rpc = await ByzCoinRPC.newByzCoinRPC(roster, darc, BLOCK_INTERVAL);

        const sig = SignerEd25519.random();
        const d3 = newDarc([SIGNER], [sig], Buffer.from("sub-darc"));
        const d2 = newDarc([SIGNER], [new IdentityDarc({id: d3.getBaseID()})]);
        const d1 = newDarc([SIGNER], [new IdentityDarc({id: d2.getBaseID()})]);
        const di1 = await DarcInstance.spawn(rpc, darc.getBaseID(), [SIGNER], d1);
        const di2 = await DarcInstance.spawn(rpc, darc.getBaseID(), [SIGNER], d2);
        const di3 = await DarcInstance.spawn(rpc, darc.getBaseID(), [SIGNER], d3);
        expect(di1.ruleMatch(DarcInstance.commandSign, [sig])).toBeTruthy();
        expect(di1.ruleMatch(DarcInstance.commandSign, [new IdentityDarc({id: d2.getBaseID()})])).toBeTruthy();
    });
});
