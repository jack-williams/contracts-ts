import { expect } from 'chai';
import * as mocha from 'mocha';
import * as tracking from './tracking'
import * as types from '../contractTypes';

describe("Blame Negation", () => {
    const p = tracking.makeRootNode(tracking.label("p"));
    const [pL, pR] = tracking.makeBranchNodes(types.TypeKind.Intersection, p);

    it("should complement root nodes", () => {
        const result = tracking.isPositive(tracking.negate(p));
        expect(result).to.equal(false);
    });

    it("should complement branch nodes", () => {
        const resultL = tracking.isPositive(tracking.negate(pL));
        const resultR = tracking.isPositive(tracking.negate(pR));
        expect(resultL).to.equal(false);
        expect(resultR).to.equal(false);
    });

    it("should be involutive", () => {
        const doubleNegate = (p: tracking.BlameNode) => tracking.negate(tracking.negate(p));
        const doubleNegateP = doubleNegate(p);
        const doubleNegatePL = doubleNegate(pL);
        const doubleNegatePR = doubleNegate(pR);

        expect(tracking.isPositive(doubleNegateP)).to.
            equal(true, "Positive root should be positive after double negation");

        expect(p.info).to.
            equal(doubleNegateP.info,
                  "Root node info should be the same pointer after double negation.");

        expect(tracking.isPositive(doubleNegatePL)).to.
            equal(true, "Positive branch node (L) should be positive after double negation");

        expect(pL.info).to.
            equal(doubleNegatePL.info,
                  "branch node (L) info should be the same pointer after double negation.");

        expect(tracking.isPositive(doubleNegatePR)).to.
            equal(true, "Positive branch node (R) should be positive after double negation");

        expect(pR.info).to.
            equal(doubleNegatePR.info,
                  "Branch node (R) info should be the same pointer after double negation.");
    });
});

