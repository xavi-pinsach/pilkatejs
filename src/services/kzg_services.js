import fs from "fs";
import Logger from "logplease";
import * as kzg from "../kzg.js";
import bfj from "bfj";

const logger = Logger.create("pilkatejs", {showTimestamp: false});
Logger.setLogLevel("INFO");

export async function kzgSetup(pilFile, pilConfigFile, cnstPolsFile, ptauFile, preprocessedFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    const vkOutput = await kzg.kzgSetup(pilFile, pilConfigFile, cnstPolsFile, ptauFile, logger);

    await bfj.write(preprocessedFile, vkOutput, {space: 1});

    return 0;
}

export async function kzgProve(pilFile, pilConfigFile, cnstPolsFile, cmmtPolsFile, ptauFile, publicFile, proofFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    const {
        publicInputs: publicInputs, proof: proof
    } = await kzg.kzgProve(pilFile, pilConfigFile, cnstPolsFile, cmmtPolsFile, ptauFile, logger);

    await bfj.write(publicFile, publicInputs, {space: 1});
    await bfj.write(proofFile, proof, {space: 1});

    return 0;
}

export async function kzgVerify(preprocessedFile, publicFile, proofFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    const preprocessed = JSON.parse(fs.readFileSync(preprocessedFile, "utf8"));
    //const publicInputs = JSON.parse(fs.readFileSync(publicFile, "utf8"));
    const proof = JSON.parse(fs.readFileSync(proofFile, "utf8"));

    return await kzg.kzgVerify(preprocessed, /*publicInputs,*/ proof, logger);
}

export async function kzgBasic(ptauFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    await kzg.kateBasic(ptauFile, logger);

    return 0;
}
