export class Proof {
    constructor(curve, logger) {
        this.curve = curve;
        this.logger = logger;

        this.resetProof();
    }

    resetProof() {
        this.polynomials = {};
        this.evaluations = {};
        this.evaluationsW = {};
    }

    addPolynomial(key, polynomial) {
        if (key in this.polynomials) {
            this.logger.warning(`proof: polynomial.${key} already exist in proof`);
        }
        this.polynomials[key] = polynomial;
    }

    addEvaluation(key, evaluation, isNext = false) {
        const evaluationsKey = isNext ? "evaluationsW" : "evaluations";
        if (key in this[evaluationsKey]) {
            this.logger.warning(`proof: ${evaluationsKey}.${key} already exist in proof`);
        }
        this[evaluationsKey][key] = evaluation;
    }

    toObjectProof() {
        let res = {polynomials: {}, evaluations: {}, evaluationsW: {}};

        Object.keys(this.polynomials).forEach(key => {
            res.polynomials[key] = this.curve.G1.toObject(this.polynomials[key]);
        });

        Object.keys(this.evaluations).forEach(key => {
            res.evaluations[key] = this.curve.Fr.toObject(this.evaluations[key]);
        });

        Object.keys(this.evaluationsW).forEach(key => {
            res.evaluationsW[key] = this.curve.Fr.toObject(this.evaluationsW[key]);
        });

        if (this.pi) {
            res.pi = this.curve.G1.toObject(this.pi);
        }

        return res;
    }

    fromObjectProof(objectProof) {
        this.resetProof();

        Object.keys(objectProof.polynomials).forEach(key => {
            this.polynomials[key] = this.curve.G1.fromObject(objectProof.polynomials[key]);
        });

        Object.keys(objectProof.evaluations).forEach(key => {
            this.evaluations[key] = this.curve.Fr.fromObject(objectProof.evaluations[key]);
        });

        Object.keys(objectProof.evaluationsW).forEach(key => {
            this.evaluationsW[key] = this.curve.Fr.fromObject(objectProof.evaluationsW[key]);
        });

        if (objectProof.pi) {
            this.pi = this.curve.G1.fromObject(objectProof.pi);
        }
    }
}