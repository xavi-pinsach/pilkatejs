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
import {newConstantPolsArray, compile, newCommitPolsArray} from "pilcom";
import {Polynomial} from "./polynomial/polynomial.js";
import {readBinFile} from "@iden3/binfileutils";
import {readPTauHeader} from "./powersoftau_utils.js";
import {log2} from "./misc.js";
import {Proof} from "./proof.js";
import {Keccak256Transcript} from "./keccak256Transcript.js";
import {utils as ffjavascriptUtils} from "ffjavascript";

const {stringifyBigInts} = ffjavascriptUtils;

export default async function kateProve(pilFile, pilConfigFile, cnstPolsFile, cmmtPolsFile, ptauFile, logger) {
    logger.info("Starting kate prover");

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauFile, "ptau", 1, 1 << 22, 1 << 24);
    if (!sectionsPTau[12]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }

    const {curve, power: ptauPower} = await readPTauHeader(fdPTau, sectionsPTau);
    const F = new F1Field("0xFFFFFFFF00000001");
    const Fr = curve.Fr;
    const G1 = curve.G1;

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

    const pTau = new BigBuffer(domainSize * sizeG1);
    const o = sectionsPTau[12][0].p + ((2 ** (pilPower)) - 1) * sizeG1;
    await fdPTau.readToBuffer(pTau, 0, domainSize * sizeG1, o);

    // Load preprocessed polynomials
    const cnstPols = newConstantPolsArray(pil);
    await cnstPols.loadFromFile(cnstPolsFile);

    // Load committed polynomials
    const cmmtPols = newCommitPolsArray(pil);
    await cmmtPols.loadFromFile(cmmtPolsFile);

    let challenges = {};
    challenges.b = {};

    let proof = new Proof(curve, logger);
    let polynomials = {};

    // KATE 1. Compute the commitments
    // Rebuild preprocessed polynomials
    for (let i = 0; i < cnstPols.$$nPols; i++) {
        const cnstPol = cnstPols.$$defArray[i];
        const cnstPolBuffer = cnstPols.$$array[i];

        if (logger) {
            logger.info(`Preparing constant ${cnstPol.name} polynomial`);
        }

        // Convert from one filed to another (bigger), TODO check if a new constraint is needed
        let polEvalBuff = new BigBuffer(cnstPolBuffer.length * Fr.n8);
        for (let i = 0; i < cnstPolBuffer.length; i++) {
            polEvalBuff.set(Fr.e(cnstPolBuffer[i]), i * Fr.n8);
        }

        polynomials[cnstPol.name] = await Polynomial.fromBuffer(polEvalBuff, Fr, logger);
        polynomials[cnstPol.name] = await polynomials[cnstPol.name].divZh();

        // Calculates the commitment
        const polCommitment = await polynomials[cnstPol.name].expTau(pTau, curve, logger);

        // Add the commitment to the proof
        proof.addPolynomial(cnstPol.name, polCommitment);
    }

    // Add committed polynomials commitments to the proof
    for (let i = 0; i < cmmtPols.$$nPols; i++) {
        const cmmtPol = cmmtPols.$$defArray[i];
        const cmmtPolBuffer = cmmtPols.$$array[i];

        if (logger) {
            logger.info(`Preparing committed ${cmmtPol.name} polynomial`);
        }

        // Convert from one filed to another (bigger), TODO check if a new constraint is needed
        let polEvalBuff = new BigBuffer(cmmtPolBuffer.length * Fr.n8);
        for (let i = 0; i < cmmtPolBuffer.length; i++) {
            polEvalBuff.set(Fr.e(cmmtPolBuffer[i]), i * Fr.n8);
        }

        polynomials[cmmtPol.name] = await Polynomial.fromBuffer(polEvalBuff, Fr, logger);

        // Blind polynomial with random blinding scalars b_{2i}, b_{2i+1} ∈ Zp
        // challenges.b[cmmtPol.name] = [Fr.random(), Fr.random()];
        // polynomials[cmmtPol.name].blindCoefficients(challenges.b[cmmtPol.name]); // What to do with the blind coefficients!!!!

        polynomials[cmmtPol.name] = await polynomials[cmmtPol.name].divZh();

        // Calculates the commitment
        const polCommitment = await polynomials[cmmtPol.name].expTau(pTau, curve, logger);

        // Add the commitment to the proof
        proof.addPolynomial(cmmtPol.name, polCommitment);
    }

    // KATE 2. Samples an evaluation challenge z ∈ Z_p:
    const transcript = new Keccak256Transcript(curve);

    for (const polName in polynomials) {
        transcript.appendPolCommitment(proof.polynomials[polName]);
    }

    challenges.z = transcript.getChallenge();
    if (logger) {
        logger.info("Challenge z computed: " + Fr.toString(challenges.z));
    }

    // KATE 3. Computes pi(z),for i = 1,...,t.
    transcript.reset();
    for (const polName in polynomials) {
        const evaluation = polynomials[polName].evaluate(challenges.z);
        proof.addEvaluation(polName, evaluation);
        transcript.appendScalar(evaluation);
    }

    // KATE 4. Samples an opening challenge α ∈ Zp.
    challenges.alpha = transcript.getChallenge();
    if (logger) {
        logger.info("Challenge alpha computed: " + Fr.toString(challenges.alpha));
    }

    // KATE 5 Computes the proof π = [q(s)]1
    // Computes the polynomial q(x) := ∑ α^{i-1} (pi(x) − pi(z)) / (x - z)
    let maxDegree = 0;
    Object.keys(polynomials).forEach(key => {
        maxDegree = Math.max(maxDegree, polynomials[key].degree());
    });

    let polQ = new Polynomial(new BigBuffer((maxDegree + 1) * Fr.n8), Fr, logger);

    let alphaCoef = Fr.one;
    for (const [polName] of Object.entries(polynomials).sort()) {
        polQ.add(polynomials[polName], alphaCoef);
        polQ.subScalar(Fr.mul(alphaCoef, proof.evaluations[polName]));

        alphaCoef = Fr.mul(alphaCoef, challenges.alpha);
    }
    polQ.divByXValue(challenges.z);

    proof.pi = await polQ.expTau(pTau, curve, logger);
    if (logger) {
        logger.info("Computed proof: " + curve.G1.toString(proof.pi));
    }

    logger.info("Kate prover finished successfully");

    //TODO construct public Signals...
    let publicSignals = {};

    // Remove constant polynomials from the proof because they are in the preprocessed data already
    for (let i = 0; i < cnstPols.$$nPols; i++) {
        delete proof.polynomials[cnstPols.$$defArray[i].name];
    }

    // Finish curve & close file descriptors
    await curve.terminate();
    fdPTau.close();

    return {publicInputs: stringifyBigInts(publicSignals), proof: stringifyBigInts(proof.toObjectProof())};
}
