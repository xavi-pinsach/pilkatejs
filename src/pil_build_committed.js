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

import {newCommitPolsArray, compile} from "pilcom";
import {F1Field} from "ffjavascript";
import fs from "fs";

export default async function pilBuildConstant(pilFile, pilConfigFile, smBuilderFile, inputFile, outputFile, logger) {
    logger.info(`Build committed polynomials file from ${pilFile} file with input from ${inputFile}`);

    const F = new F1Field("0xFFFFFFFF00000001");

    const config = undefined !== pilConfigFile ? JSON.parse(fs.readFileSync(pilConfigFile)) : {};
    const pil = await compile(F, pilFile, null, config);

    const input = JSON.parse(await fs.promises.readFile(inputFile, "utf8"));

    const cmmtPols = newCommitPolsArray(pil);

    const {execute: buildCmmt} = await import(smBuilderFile);
    const res = await buildCmmt(cmmtPols, input);

    await cmmtPols.saveToFile(outputFile);

    logger.info("Result: " + res);
    logger.info(`Committed polynomials successfully built to ${outputFile}`);

    return 0;
}


