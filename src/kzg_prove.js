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

import {BigBuffer, F1Field, utils as ffjavascriptUtils} from "ffjavascript";
import {compile, newCommitPolsArray, newConstantPolsArray} from "pilcom";
import {Polynomial} from "./polynomial/polynomial.js";
import {readBinFile} from "@iden3/binfileutils";
import {readPTauHeader} from "./powersoftau_utils.js";
import {log2} from "./misc.js";
import {Proof} from "./proof.js";
import {Keccak256Transcript} from "./keccak256Transcript.js";

const {stringifyBigInts} = ffjavascriptUtils;


export default async function kateProve(pilFile, pilConfigFile, cnstPolsFile, cmmtPolsFile, ptauFile, logger) {
    logger.info("Starting kate prover");

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauFile, "ptau", 1, 1 << 22, 1 << 24);
    if (!sectionsPTau[2]) {
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

    const pTauBuffer = new BigBuffer(domainSize * sizeG1);
    await fdPTau.readToBuffer(pTauBuffer, 0, domainSize * sizeG1, sectionsPTau[2][0].p);

    // Load preprocessed polynomials
    const cnstPols = newConstantPolsArray(pil);
    await cnstPols.loadFromFile(cnstPolsFile);

    // Load committed polynomials
    const cmmtPols = newCommitPolsArray(pil);
    await cmmtPols.loadFromFile(cmmtPolsFile);

    // Get all polynomials p'(x) referenced in any expression
    const primePols = getPrimePolynomials(pil.expressions);

    function findPolynomialByTypeId(type, id) {
        for (const polName in pil.references) {
            if (pil.references[polName].type === type && pil.references[polName].id === id) return polName;
        }
    }

    for (let i = 0; i < primePols.length; i++) {
        primePols[i].reference = findPolynomialByTypeId(primePols[i].op + "P", primePols[i].id);
    }

    let challenges = {};
    challenges.b = {};

    let proof = new Proof(curve, logger);

    let polynomials = {};

    // ROUND 1. Commits to the committed polynomials
    await round1(curve, pTauBuffer, cnstPols, cmmtPols, polynomials, pil, proof, logger);

    // ROUND 2. Build h1 & h2 polynomials from the plookups
//    round2(curve, polynomials, challenges, proof, logger);

    // ROUND 3. Build the Z polynomial from each non-identity constraint
//    round3(curve, polynomials, challenges, proof, logger);

    // ROUND 4. Build the constraint polynomial C
//    round4(curve, polynomials, challenges, proof, logger);

    // ROUND 5. Computes opening evaluations for each polynomial in polynomials
    round5(curve, pilPower, polynomials, primePols, challenges, proof, logger);

    // ROUND 6. Compute the opening batched proof polynomials Wxi(X) and Wxiω(X)
    await round6(curve, pTauBuffer, polynomials, primePols, challenges, proof, logger);

    //TODO construct public Signals...
    //let publicSignals = {};

    // Remove constant polynomials from the proof because they are in the preprocessed data already
    for (let i = 0; i < cnstPols.$$nPols; i++) {
        delete proof.polynomials[cnstPols.$$defArray[i].name];
    }
    delete challenges.xiw;

    logger.info("Kate prover finished successfully");

    // Finish curve & close file descriptors
    await curve.terminate();
    fdPTau.close();

    return {/*publicInputs: stringifyBigInts(publicSignals),*/ proof: stringifyBigInts(proof.toObjectProof())};
}

async function round1(curve, pTauBuffer, cnstPols, cmmtPols, polynomials, pil, proof, logger) {
    const Fr = curve.Fr;

    // KATE 1. Compute the commitments

    // Rebuild preprocessed polynomials
    for (let i = 0; i < cnstPols.$$nPols; i++) {
        const cnstPol = cnstPols.$$defArray[i];
        const cnstPolBuffer = cnstPols.$$array[i];

        const polCommitment = await computeCommitment(cnstPol, cnstPolBuffer);

        // Add the commitment to the proof
        proof.addPolynomial(cnstPol.name, polCommitment);
    }

    // Add committed polynomials commitments to the proof
    for (let i = 0; i < cmmtPols.$$nPols; i++) {
        const cmmtPol = cmmtPols.$$defArray[i];
        const cmmtPolBuffer = cmmtPols.$$array[i];

        //TODO blind polynomial??????
        const polCommitment = await computeCommitment(cmmtPol, cmmtPolBuffer);

        // Add the commitment to the proof
        proof.addPolynomial(cmmtPol.name, polCommitment);
    }

    return 0;

    async function computeCommitment(pol, polBuffer) {
        if (logger) {
            logger.info(`Preparing constant ${pol.name} polynomial`);
        }

        // Convert from one filed to another (bigger), TODO check if a new constraint is needed
        let polEvalBuff = new BigBuffer(polBuffer.length * Fr.n8);
        for (let i = 0; i < polBuffer.length; i++) {
            polEvalBuff.set(Fr.e(polBuffer[i]), i * Fr.n8);
        }

        polynomials[pol.name] = await Polynomial.fromBuffer(polEvalBuff, Fr, logger);

        // Calculates the commitment
        return await polynomials[pol.name].evaluateG1(pTauBuffer, curve, logger);
    }
}

// ROUND 5. Computes opening evaluations for each polynomial in polynomials
function round5(curve, pilPower, polynomials, primePols, challenges, proof, logger) {
    const Fr = curve.Fr;

    const transcript = new Keccak256Transcript(curve);
    for (const polName in polynomials) {
        transcript.appendPolCommitment(proof.polynomials[polName]);
    }

    // Samples an opening evaluation challenge xi ∈ F_p
    challenges.xi = transcript.getChallenge();
    if (logger) logger.info("Challenge xi computed: " + Fr.toString(challenges.xi));

    // Computes opening evaluations for each polynomial in polynomials
    for (const polName in polynomials) {
        const evaluation = polynomials[polName].evaluate(challenges.xi);
        proof.addEvaluation(polName, evaluation);
    }


    challenges.xiw = Fr.mul(challenges.xi, Fr.w[pilPower]);

    // Computes opening evaluations for each polynomial in primePols
    primePols.forEach(primePol => {
        const evaluation = polynomials[primePol.reference].evaluate(challenges.xiw);
        proof.addEvaluation(primePol.reference, evaluation, true);
    });
}

// ROUND 6. Compute the opening batched proof polynomials Wxi(X) and Wxiω(X)
async function round6(curve, pTauBuffer, polynomials, primePols, challenges, proof, logger) {
    const Fr = curve.Fr;

    const transcript = new Keccak256Transcript(curve);
    for (const polName in polynomials) {
        transcript.appendScalar(proof.evaluations[polName]);
    }

    // Samples an opening challenge v ∈ Fp.
    challenges.v = transcript.getChallenge();
    if (logger) logger.info("Challenge v computed: " + Fr.toString(challenges.v));

    // Samples an opening challenge vp ∈ Fp.
    transcript.reset();
    transcript.appendScalar(challenges.v);
    challenges.vp = transcript.getChallenge();
    if (logger) logger.info("Challenge vp computed: " + Fr.toString(challenges.vp));

    // KATE 5 Computes the proof π = [q(s)]1
    // Computes the polynomial q(x) := ∑ α^{i-1} (pi(x) − pi(z)) / (x - z)
    let maxDegree = 0;
    Object.keys(polynomials).forEach(key => {
        maxDegree = Math.max(maxDegree, polynomials[key].degree());
    });

    let polWxi = new Polynomial(new BigBuffer((maxDegree + 1) * Fr.n8), Fr, logger);

    let alphaCoef = Fr.one;
    for (const polName of Object.keys(polynomials).sort()) {
        polWxi.add(polynomials[polName], alphaCoef);
        polWxi.subScalar(Fr.mul(proof.evaluations[polName], alphaCoef));

        alphaCoef = Fr.mul(alphaCoef, challenges.v);
    }
    polWxi.divByXValue(challenges.xi);

    proof.Wxi = await polWxi.evaluateG1(pTauBuffer, curve, logger);
    if (logger) {
        logger.info("Computed proof: " + curve.G1.toString(proof.Wxi));
    }

    let maxDegreeW = 0;
    primePols.forEach(primePol => {
        maxDegreeW = Math.max(maxDegreeW, polynomials[primePol.reference].degree());
    });

    let polWxiw = new Polynomial(new BigBuffer((maxDegreeW + 1) * Fr.n8), Fr, logger);

    alphaCoef = Fr.one;
    let references = primePols.map(a => a.reference).sort();
    for (const polName of references) {
        polWxiw.add(polynomials[polName], alphaCoef);
        polWxiw.subScalar(Fr.mul(proof.evaluationsW[polName], alphaCoef));

        alphaCoef = Fr.mul(alphaCoef, challenges.vp);
    }
    polWxiw.divByXValue(challenges.xiw);

    proof.Wxiw = await polWxiw.evaluateG1(pTauBuffer, curve, logger);
    if (logger) {
        logger.info("Computed proof: " + curve.G1.toString(proof.Wxiw));
    }
}

function getPrimePolynomials(exp) {
    if (Array.isArray(exp)) {
        let primePolynomials = [];
        for (let i = 0; i < exp.length; i++) {
            primePolynomials = primePolynomials.concat(getPrimePolynomials(exp[i]));
        }
        return primePolynomials;
    } else if (exp.hasOwnProperty("values")) {
        return getPrimePolynomials(exp.values);
    } else {
        if (exp.next && ("const" === exp.op || "cm" === exp.op)) {
            return [exp];
        }
        return [];
    }
}