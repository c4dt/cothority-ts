import { createHash } from "crypto";
import Long from "long";
import { Message, Properties } from "protobufjs/light";
import DarcInstance from "../byzcoin/contracts/darc-instance";
import { EMPTY_BUFFER, registerMessage } from "../protobuf";
import IdentityWrapper, { IIdentity } from "./identity-wrapper";
import Rules from "./rules";

/**
 * Distributed Access Right Controls
 */
export default class Darc extends Message<Darc> {
    static readonly ruleSign = "_sign";

    /**
     * Get the id of the darc
     * @returns the id as a buffer
     */
    get id(): Buffer {
        const h = createHash("sha256");
        const versionBuf = Buffer.from(this.version.toBytesLE());
        h.update(versionBuf);
        h.update(this.description);

        if (this.baseID.length > 0) {
            h.update(this.baseID);
        }
        if (this.prevID.length > 0) {
            h.update(this.prevID);
        }

        this.rules.list.forEach((r) => {
            h.update(r.action);
            h.update(r.expr);
        });

        return h.digest();
    }

    /**
     * @see README#Message classes
     */
    static register() {
        registerMessage("Darc", Darc, Rules);
    }

    readonly version: Long;
    readonly description: Buffer;
    readonly baseID: Buffer;
    readonly prevID: Buffer;
    readonly rules: Rules;

    constructor(properties?: Properties<Darc>) {
        super(properties);

        this.description = Buffer.from(this.description || EMPTY_BUFFER);
        this.baseID = Buffer.from(this.baseID || EMPTY_BUFFER);
        this.prevID = Buffer.from(this.prevID || EMPTY_BUFFER);
        this.rules = this.rules || new Rules();

        /* Protobuf aliases */

        Object.defineProperty(this, "baseid", {
            get(): Buffer {
                return this.baseID;
            },
            set(value: Buffer) {
                this.baseID = value;
            },
        });

        Object.defineProperty(this, "previd", {
            get(): Buffer {
                return this.prevID;
            },
            set(value: Buffer) {
                this.prevID = value;
            },
        });
    }

    /**
     * Get the id of the genesis darc
     * @returns the id as a buffer
     */
    getBaseID(): Buffer {
        if (this.version.eq(0)) {
            return this.id;
        } else {
            return this.baseID;
        }
    }

    /**
     * Append an identity to a rule using the given operator when
     * it already exists
     * @param rule      the name of the rule
     * @param identity  the identity to append to the rule
     * @param op        the operator to use if necessary
     */
    addIdentity(rule: string, identity: IIdentity, op: string): void {
        this.rules.appendToRule(rule, identity, op);
    }

    /**
     * Copy and evolve the darc to the next version so that it can be
     * changed and proposed to byzcoin.
     * @returns a new darc
     */
    evolve(): Darc {
        return new Darc({
            baseID: this.getBaseID(),
            description: this.description,
            prevID: this.id,
            rules: this.rules.clone(),
            version: this.version.add(1),
        });
    }

    /**
     * Get a string representation of the darc
     * @returns the string representation
     */
    toString(): string {
        return "ID: " + this.id.toString("hex") + "\n" +
            "Base: " + this.baseID.toString("hex") + "\n" +
            "Prev: " + this.prevID.toString("hex") + "\n" +
            "Version: " + this.version + "\n" +
            "Rules: " + this.rules;
    }

    /**
     * Helper to encode the darc using protobuf
     * @returns encoded darc as a buffer
     */
    toBytes(): Buffer {
        return Buffer.from(Darc.encode(this).finish());
    }

    /**
     * Returns a deep copy of the darc.
     */
    copy(): Darc {
        return Darc.decode(this.toBytes());
    }

    /**
     * Checks whether the given rule can be matched by a multi-signature created by all
     * signers. If the rule doesn't exist, it throws an error.
     * Currently restrictions:
     *  - only Rules.OR are supported. A Rules.AND or "(" will return an error.
     *  - only one identity can be checked. If more identities are given, the function
     *  returns an error.
     *
     * @param action the action to match
     * @param signers all supposed signers for this action.
     * @return the set of identities that match the rule.
     */
    async ruleMatch(action: string, signers: IIdentity[],
                    getDarc: (id: Buffer) => Promise<Darc>): Promise<IIdentity[]> {
        const rule = this.rules.getRule(action);
        if (!rule) {
            throw new Error("This rule doesn't exist");
        }
        if (signers.length !== 1) {
            throw new Error("Currently only supports checking 1 identity");
        }
        const expr = rule.expr.toString();
        if (expr.match(/(\(|\)|\&)/)) {
            throw new Error("Cannot handle Rules.AND, (, ) for the moment.");
        }
        const ids = expr.split(Rules.OR);
        for (const idStr of ids) {
            const id = IdentityWrapper.fromString(idStr.trim());
            if (id.toString() === signers[0].toString()) {
                return signers;
            }
            if (id.darc) {
                const d = await getDarc(id.darc.id);
                if ((await d.ruleMatch(Darc.ruleSign, signers, getDarc)).length === 1) {
                    return signers;
                }
            }
        }
        return [];
    }
}

Darc.register();
