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

import {BigBuffer, F1Field} from "ffjavascript";
import {newConstantPolsArray, compile} from "pilcom";
import {utils as ffjavascriptUtils} from "ffjavascript";

const {stringifyBigInts} = ffjavascriptUtils;
import {readBinFile} from "@iden3/binfileutils";
import {readPTauHeader} from "./powersoftau_utils.js";
import {log2} from "./misc.js";
import {Polynomial} from "./polynomial/polynomial.js";

export default async function kateSetup(pilFile, pilConfigFile, cnstPolsFile, ptauFile, logger) {
    logger.info("Starting kate setup");

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauFile, "ptau", 1, 1 << 22, 1 << 24);
    if (!sectionsPTau[12]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }

    const {curve, power: ptauPower} = await readPTauHeader(fdPTau, sectionsPTau);
    const F = new F1Field("0xFFFFFFFF00000001");
    const Fr = curve.Fr;
    const G1 = curve.G1;
    const G2 = curve.G2;

    // PIL compile
    const pil = await compile(F, pilFile, null, pilConfigFile);

    //Find the max PIL polynomial degree
    let maxPilPolDeg = 0;
    for (const polRef in pil.references) {
        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }

    const pilPower = log2(maxPilPolDeg - 1) + 1;
    const domainSize = 2 ** pilPower;

    if (pilPower > ptauPower) {
        if (logger) logger.error(`PIL polynomials degree is too big for this powers of Tau, 2**${pilPower} > 2**${ptauPower}`);
        return -1;
    }

    const sizeG1 = G1.F.n8 * 2;
    const sizeG2 = G2.F.n8 * 2;

    const pTau = new BigBuffer(domainSize * sizeG1);
    const o = sectionsPTau[12][0].p + ((2 ** (pilPower)) - 1) * sizeG1;
    await fdPTau.readToBuffer(pTau, 0, domainSize * sizeG1, o);

    let preprocessed = {
        protocol: "kate",
        curve: "bn128",
        power: pilPower,
        // w: Fr.toObject(Fr.w[pilPower]),
        S_2: G2.toObject(await fdPTau.read(sizeG2, sectionsPTau[3][0].p + sizeG2)),
        polynomials: {},
    };

    // Load preprocessed polynomials
    const cnstPols = newConstantPolsArray(pil);
    await cnstPols.loadFromFile(cnstPolsFile);

    for (let i = 0; i < cnstPols.$$nPols; i++) {
        const cnstPol = cnstPols.$$defArray[i];
        const cnstPolBuffer = cnstPols.$$array[i];

        if (logger) {
            logger.info(`Preparing ${cnstPol.name} polynomial`);
        }

        // Convert from one filed to another (bigger), TODO check if a new constraint is needed
        let polEvalBuff = new BigBuffer(cnstPolBuffer.length * Fr.n8);
        for (let i = 0; i < cnstPolBuffer.length; i++) {
            polEvalBuff.set(Fr.e(cnstPolBuffer[i]), i * Fr.n8);
        }

        let pol = await Polynomial.fromBuffer(polEvalBuff, Fr, logger);
        pol = await pol.divZh();

        // Calculates the commitment
        const polCommitment = await pol.expTau(pTau, curve, logger);

        // Add the commitment to the preprocessed polynomials
        preprocessed.polynomials[cnstPol.name] = G1.toObject(polCommitment);
    }

    // Finish curve & close file descriptors
    await curve.terminate();
    fdPTau.close();

    logger.info("Kate setup finished");

    return stringifyBigInts(preprocessed);
}