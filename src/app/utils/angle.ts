export class Angle {
	private _value: number;
	unit: "rad" | "deg";

	constructor(value = 0, unit: "rad" | "deg" = "rad") {
		this._value = value;
		this.unit = unit;
	}

	get rad() {
		if (this.unit === "deg") {
			return (this._value / 180) * Math.PI;
		}
		return this._value;
	}

	get deg() {
		if (this.unit === "rad") {
			return (this._value / Math.PI) * 180;
		}
		return this._value;
	}

	constrain() {
		let limit: number;
		if (this.unit === "rad") {
			limit = Math.PI * 2;
		}
		if (this.unit === "deg") {
			limit = 360;
		}
		while (this._value < 0) {
			this._value += limit;
		}
		while (this._value > limit) {
			this._value -= limit;
		}
		return this;
	}

	set(value = 0, unit: "rad" | "deg" = "rad") {
		this._value = value;
		this.unit = unit;
		return this;
	}
}
