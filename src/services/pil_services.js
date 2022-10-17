import path from "path";
import Logger from "logplease";
import * as pil from "../pil.js";

const logger = Logger.create("pilkatejs", {showTimestamp: false});
Logger.setLogLevel("INFO");

export async function pilBuildConstant(pilFile, pilConfigFile, smBuilderFile, outputFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    return pil.pilBuildConstant(pilFile, pilConfigFile, path.join(__dirname, smBuilderFile), outputFile, logger);
}

export async function pilBuildCommitted(pilFile, pilConfigFile, smBuilderFile, smInputFile, outputFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    return pil.pilBuildCommitted(pilFile, pilConfigFile, path.join(__dirname, smBuilderFile), smInputFile, outputFile, logger);
}

export async function pilVerify(pilFile, pilConfigFile, cnstPolsFile, cmmtPolsFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    return pil.pilVerify(pilFile, pilConfigFile, cnstPolsFile, cmmtPolsFile, logger);
}