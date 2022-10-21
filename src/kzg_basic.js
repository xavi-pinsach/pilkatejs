/*
    Copyright 2022 iden3

    This file is part of pilkatejs

    pilkatejs is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    pilkatejs is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with pilkatejs. If not, see <https://www.gnu.org/licenses/>.
*/

import {BigBuffer} from "ffjavascript";
import {Polynomial} from "./polynomial/polynomial.js";
import {readBinFile} from "@iden3/binfileutils";
import {readPTauHeader} from "./powersoftau_utils.js";

export default async function kateBasic(ptauFile, logger) {
    logger.info("Starting kate test");

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauFile, "ptau", 1, 1 << 22, 1 << 24);
    if (!sectionsPTau[2]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }

    const {curve, power: ptauPower} = await readPTauHeader(fdPTau, sectionsPTau);
    const Fr = curve.Fr;
    const G1 = curve.G1;
    const G2 = curve.G2;
    const sizeG1 = G1.F.n8 * 2;
    const sizeG2 = G2.F.n8 * 2;

    const power = 2;
    const domainSize = 2 ** power;

    if (power > ptauPower) {
        if (logger) logger.error(`PIL polynomials degree is too big for this powers of Tau, 2**${power} > 2**${ptauPower}`);
        return -1;
    }

    const pTauBuffer = new BigBuffer(domainSize * sizeG1);
    await fdPTau.readToBuffer(pTauBuffer, 0, domainSize * sizeG1, sectionsPTau[2][0].p);

    // Get the polynomial
    let pol = new Polynomial(new Uint8Array(Fr.n8 * domainSize), Fr, logger);
    pol.coef.set(Fr.e(5), 0);
    pol.coef.set(Fr.e(1), Fr.n8);
    pol.coef.set(Fr.e(0), Fr.n8 * 2);
    pol.coef.set(Fr.e(1), Fr.n8 * 3);

    // Commit
    const polCommitment = await pol.evaluateG1(pTauBuffer, curve, logger, "pol");

    const z = Fr.e(3);
    const y = pol.evaluate(z);

    // Evaluation proof
    pol.subScalar(y);
    pol.divByXValue(z);

    const proof = await pol.evaluateG1(pTauBuffer, curve, logger, "proof");

    const A1 = proof;
    let S_2 = await fdPTau.read(sizeG2, sectionsPTau[3][0].p + sizeG2);
    const A2 = G2.sub(S_2, curve.G2.toAffine(G2.timesFr(G2.one, z)));

    const B1 = G1.sub(polCommitment, G1.timesFr(G1.one, y));
    const B2 = G2.one;

    // Pairing
    const res = await curve.pairingEq(A1, A2, B1, B2);

    // Finish curve & close file descriptors
    await curve.terminate();
    fdPTau.close();

    return res;
}