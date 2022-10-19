import Logger from "logplease";
import * as pil from "../pil.js";

const logger = Logger.create("pilkatejs", {showTimestamp: false});
Logger.setLogLevel("INFO");

export async function pilBuildConstant(pilFile, pilConfigFile, smBuilderFile, outputFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await pil.pilBuildConstant(pilFile, pilConfigFile, smBuilderFile, outputFile, logger);
}

export async function pilBuildCommitted(pilFile, pilConfigFile, smBuilderFile, smInputFile, outputFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await pil.pilBuildCommitted(pilFile, pilConfigFile, smBuilderFile, smInputFile, outputFile, logger);
}

export async function pilVerify(pilFile, pilConfigFile, cnstPolsFile, cmmtPolsFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    return await pil.pilVerify(pilFile, pilConfigFile, cnstPolsFile, cmmtPolsFile, logger);
}