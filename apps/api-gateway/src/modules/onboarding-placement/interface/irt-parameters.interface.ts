export interface IrtParameters {
	a: number; // discrimination - 0.5>2.5
	b: number; // difficulty - -3>3
	c: number; // guessing - 0>0.3
}

export interface IrtResponse extends IrtParameters {
	correct: 0 | 1;
}
