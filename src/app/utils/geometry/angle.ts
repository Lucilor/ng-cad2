import {DEFAULT_TOLERANCE} from "./constants";

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
	    let limit = 0;
	    if (this.unit === "rad") {
	        limit = Math.PI * 2;
	    } else if (this.unit === "deg") {
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

	set(value = 0, unit = this.unit) {
	    this._value = value;
	    this.unit = unit;
	    return this;
	}

	clone() {
	    return new Angle(this._value, this.unit);
	}

	copy(angle: Angle) {
	    this._value = angle._value;
	    this.unit = angle.unit;
	}

	add(angle: Angle) {
	    if (this.unit === "deg") {
	        this._value += angle.deg;
	    } else if (this.unit === "rad") {
	        this._value += angle.rad;
	    }
	    return this;
	}

	sub(angle: Angle) {
	    if (this.unit === "deg") {
	        this._value -= angle.deg;
	    } else if (this.unit === "rad") {
	        this._value -= angle.rad;
	    }
	    return this;
	}

	multiply(angle: Angle) {
	    if (this.unit === "deg") {
	        this._value *= angle.deg;
	    } else if (this.unit === "rad") {
	        this._value *= angle.rad;
	    }
	    return this;
	}

	divide(angle: Angle) {
	    if (this.unit === "deg") {
	        this._value /= angle.deg;
	    } else if (this.unit === "rad") {
	        this._value /= angle.rad;
	    }
	    return this;
	}

	equals(angle: Angle, tolerance = DEFAULT_TOLERANCE) {
	    return Math.abs(this.rad - angle.rad) <= tolerance;
	}
}
