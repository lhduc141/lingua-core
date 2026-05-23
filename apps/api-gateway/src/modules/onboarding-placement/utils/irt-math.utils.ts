import { CefrAssignment } from '../interface/cefr-assignment.interface';

export class IrtMathUtils {
	static logistic(a: number, b: number, theta: number): number {
		return 1 / (1 + Math.exp(-a * (theta - b)));
	}

	// Tính P(theta) theo công thức - P(θ) = c + (1 - c) / (1 + e^(-a(θ - b)))
	static calculate3PLProbability(theta: number, a: number, b: number, c: number): number {
		return c + (1 - c) * this.logistic(a, b, theta);
	}

	// Tính đạo hàm: dP/d(theta)
	static calculateDerivative(theta: number, a: number, b: number, c: number): number {
		const psi = this.logistic(a, b, theta);
		return a * (1 - c) * psi * (1 - psi);
	}

	// Tính toán độ phù hợp dựa trên công thức IRT
	static calculateInformation(theta: number, a: number, b: number, c: number): number {
		const P = this.calculate3PLProbability(theta, a, b, c);
		const Q = 1 - P;
		const dP = this.calculateDerivative(theta, a, b, c);

		if (P < 0.001 || Q < 0.001) return 0;

		return (dP * dP) / (P * Q);
	}

	static estimateThetaMLE(
		responses: Array<{ a: number; b: number; c: number; correct: number }>,
		initialTheta = 0,
	): number {
		if (responses.length === 0) return initialTheta;

		// Edge cases: all correct / all incorrect → boundary values
		const allCorrect = responses.every((r) => r.correct === 1);
		const allIncorrect = responses.every((r) => r.correct === 0);
		if (allCorrect) return 3.0;
		if (allIncorrect) return -3.0;

		let theta = initialTheta;

		for (let iter = 0; iter < 50; iter++) {
			let L1 = 0;
			let L2 = 0;

			for (const r of responses) {
				const P = this.calculate3PLProbability(theta, r.a, r.b, r.c);
				const Q = 1 - P;
				const dP = this.calculateDerivative(theta, r.a, r.b, r.c);

				if (P < 0.001 || Q < 0.001) continue;

				L1 += (dP / (P * Q)) * (r.correct - P);
				L2 -= (dP * dP) / (P * Q);
			}

			if (Math.abs(L2) < 1e-10) break;

			const delta = L1 / L2;
			theta = theta - delta;

			theta = Math.max(-4, Math.min(4, theta));

			if (Math.abs(delta) < 0.001) break;
		}

		// Final clamp to reportable range
		return Math.max(-3, Math.min(3, parseFloat(theta.toFixed(4))));
	}

	static calculateSE(theta: number, params: Array<{ a: number; b: number; c: number }>): number {
		const totalInfo = params.reduce((sum, r) => sum + this.calculateInformation(theta, r.a, r.b, r.c), 0);

		if (totalInfo <= 0) return 2.0;
		return parseFloat((1 / Math.sqrt(totalInfo)).toFixed(4));
	}

	static mapThetaToCEFR(theta: number, se: number): CefrAssignment {
		const level = this.thetaToLevel(theta);
		const lowerTheta = theta - 1.96 * se;
		const upperTheta = theta + 1.96 * se;

		return {
			level,
			confidence: {
				lower: this.thetaToLevel(lowerTheta),
				upper: this.thetaToLevel(upperTheta),
			},
			thetaBounds: {
				lower: parseFloat(Math.max(-3, lowerTheta).toFixed(2)),
				estimate: parseFloat(theta.toFixed(2)),
				upper: parseFloat(Math.min(3, upperTheta).toFixed(2)),
			},
		};
	}

	static thetaToLevel(theta: number): 'A1' | 'A2' | 'B1' | 'B2' | 'C1' {
		if (theta < -1.5) return 'A1';
		if (theta < -0.5) return 'A2';
		if (theta < 0.5) return 'B1';
		if (theta < 1.5) return 'B2';
		return 'C1';
	}
}
