import {F1Field} from "ffjavascript";

export async function buildConstants(cnstPols) {
    const simplePol = cnstPols.Simple;

    const N = simplePol.CNST.length;

    for (let i = 0; i < N; i++) {
        simplePol.CNST[i] = BigInt(i);
    }
}


export async function execute(cmmtPols) {
    const simplePol = cmmtPols.Simple;

    const N = simplePol.cmmt.length;

    for (let i = 0; i < N; i++) {
        simplePol.cmmt[i] = BigInt(i);
    }

    return 1024;
}