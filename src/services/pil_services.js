import path from "path";
import Logger from "logplease";
import * as pil from "../pil.js";
import url from "url";

const logger = Logger.create("pilkatejs", {showTimestamp: false});
Logger.setLogLevel("INFO");

const __dirname =   path.dirname(url.fileURLToPath(import.meta.url));

export async function pilBuildConstant(pilFile, pilConfigFile, smBuilderFile, outputFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    return pil.pilBuildConstant(pilFile, pilConfigFile, smBuilderFile, outputFile, logger);
}

export async function pilBuildCommitted(pilFile, pilConfigFile, smBuilderFile, smInputFile, outputFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    return pil.pilBuildCommitted(pilFile, pilConfigFile, smBuilderFile, smInputFile, outputFile, logger);
}

export async function pilVerify(pilFile, pilConfigFile, cnstPolsFile, cmmtPolsFile, options) {
    if (options.verbose) Logger.setLogLevel("DEBUG");

    return pil.pilVerify(pilFile, pilConfigFile, cnstPolsFile, cmmtPolsFile, logger);
}