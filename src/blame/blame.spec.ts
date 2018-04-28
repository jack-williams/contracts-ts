import { expect } from 'chai';
import * as mocha from 'mocha';
import * as tracking from './tracking'

describe("Blame Negation", () => {
    const p = tracking.makeRootNode(tracking.label("p"));
    it("should complement root nodes", () => {
        const result = tracking.isPositive(tracking.negate(p));
        expect(result).to.equal(false);
    });

    it("should be involutive", () => {
        const doubleNegateP = tracking.negate(tracking.negate(p));

        expect(tracking.isPositive(doubleNegateP)).to.
            equal(true, "Positive root should be positive after double negation");

        expect(p.info).to.
            equal(doubleNegateP.info,
                  "Node info should be the same pointer after double negation.");
        
    });
    
});

