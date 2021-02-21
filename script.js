/**
 * @author Marc Flerackers <mflerackers@gmail.com>
 * @license
 * Copyright (c) 2021 Marc Flerackers.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
let canvas = document.getElementById("canvas")
let ctx = canvas.getContext("2d")

class Vector {
	constructor(x, y) {
		this.x = x
		this.y = y
	}

	clone() {
		return new Vector(this.x, this.y)
	}

	get length() {
		return Math.sqrt(Vector.dot(this, this))
	}

	get normalized() {
		return Vector.mul(this, 1 / this.length)
	}

	get tangent() {
		return new Vector(-this.y, this.x);
	}

	static add(a, b) {
		return new Vector(a.x + b.x, a.y + b.y)
	}

	static sub(a, b) {
		return new Vector(a.x - b.x, a.y - b.y)
	}

	static mul(v, scalar) {
		return new Vector(v.x * scalar, v.y * scalar)
	}

	static dot(a, b) {
		return a.x * b.x + a.y * b.y
	}

	static cross(a, b) {
		return a.x * b.y - a.y * b.x
	}

	static min(a, b) {
		return new Vector(Math.min(a.x, b.x), Math.min(a.y, b.y))
	}

	static max(a, b) {
		return new Vector(Math.max(a.x, b.x), Math.max(a.y, b.y))
	}

	static abs(v) {
		return new Vector(Math.abs(v.x), Math.abs(v.y))
	}
}

Vector.ZERO = new Vector(0, 0)

function rayCastEdge(originA, endA, originB, endB) {
	const r = Vector.sub(endA, originA)
	const s = Vector.sub(endB, originB)

	const det = Vector.cross(r, s)

	if (det == 0) {
		// Co-linear
		return Number.POSITIVE_INFINITY
	}

	const dir = Vector.sub(originB, originA)

	const t1 = Vector.cross(dir, s) / det
	if (0 > t1 || t1 > 1) {
		// Outside segment 1
		return Number.POSITIVE_INFINITY
	}

	const t2 = Vector.cross(dir, r) / det
	if (0 > t2 || t2 > 1) {
		// Outside segment 2
		return Number.POSITIVE_INFINITY
	}

	return t1
}

function rayCastCircle(origin, direction, center, radius) {
	const a = Vector.dot(direction, direction)
	const centerToOrigin = Vector.sub(origin, center)
	const b = 2 * Vector.dot(direction, centerToOrigin)
	const c = Vector.dot(centerToOrigin, centerToOrigin) - radius * radius
	const det = b * b - 4 * a * c

	if ((a <= Number.EPSILON) || (det < 0)) {
		return Number.POSITIVE_INFINITY
	}
	else if (det == 0) {
		let t = -b / (2 * a)
		return (t >= 0) && (t <= 1) ? t : Number.POSITIVE_INFINITY
	}
	else {
		let t1 = (-b + Math.sqrt(det)) / (2 * a)
		let t2 = (-b - Math.sqrt(det)) / (2 * a)
		if ((t1 >= 0) && (t1 <= 1)) {
			if ((t2 >= 0) && (t2 <= 1)) {
				return Math.min(t1, t2)
			}
			else {
				return t1
			}
		}
		else if ((t2 >= 0) && (t2 <= 1)) {
			return t2
		}
		else {
			return Number.POSITIVE_INFINITY
		}
	}
}

/**
 * Subclasses need to implement four methods:
 * - contains(p) which returns true if the given point is contained by the shape
 * - closestPoint(p) which returns the point on the shape which is closest to the given point
 * - rayCast(origin, direction) which returns t of the closest intersection point between the segment and the shape
 * - optionally sum(other) which returns the Minkowski sum of the two shapes if this shape should be able to collide
 */
class Shape {
	/**
	 * Initializes the shape
	 * @param {Vector} center The center of the shape
	 */
	constructor(center) {
		this.center = center
		this.velocity = Vector.ZERO.clone()
	}

	/**
	 * Sets the velocity of the shape
	 * @param {Vector} velocity The new velocity
	 */
	setLinearVelocity(velocity) {
		this.velocity = velocity.clone()
	}
	/**
	 * Updates the shape by applying the velocity over the given amount of seconds
	 * @param {number} dt The amount of seconds passed since last update
	 */
	update(dt) {
		this.center = Vector.add(this.center, Vector.mul(this.velocity, dt))
	}
	/**
	 * Returns true if this and the other shape intersect
	 * @param other {Shape} The amount of seconds passed since last update
	 * @returns True if this and the other shape intersect
	 */
	intersects(other) {
		let s = this.sum(other)
		return s.contains(Vector.ZERO)
	}
	/**
	 * Returns the delta with which the two shapes need to be displaced in order to not intersect
	 * @param {Shape} other The other shape
	 * @returns {Vector|null} A vector if the two shapes intersect
	 */
	intersect(other) {
		let s = this.sum(other)
		if (s.contains(Vector.ZERO)) {
			let p = s.closestPoint(Vector.ZERO)
			return p
		}
		else {
			return null
		}
	}
	/**
	 * Solves the collisions between two moving shapes
	 * @param {Shape} other The other shape
	 * @param {number} dt Time elapsed in seconds
	 */
	solveCollisions(other, dt) {
		let s = other.sum(this)
		if (s.contains(Vector.ZERO)) {
			ctx.fillText(`contains in solveCollisions`, 10, 40)
			let p = s.closestPoint(Vector.ZERO)
			this.center = Vector.add(this.center, p)
		}
		else {
			ctx.fillText(`raycasting in solveCollisions`, 10, 40)
			// Velocity at which this approaches other
			let relativeMotion = Vector.sub(this.velocity, other.velocity)
			ctx.fillText(`${relativeMotion.x}, ${relativeMotion.y}`, 10, 110)
    		let h = s.rayCast(Vector.ZERO, relativeMotion)
			ctx.fillText(`${h}`, 10, 70)

    		if (h < Number.POSITIVE_INFINITY) {
				// Only move until the collision
				this.center = Vector.add(this.center, Vector.mul(this.velocity, dt * h))
				other.center = Vector.add(other.center, Vector.mul(other.velocity, dt * h))
				// Should use normal here, not tangent
				//let tangent = relativeMotion.normalized.tangent
				//ctx.fillText(`${tangent.x}, ${tangent.y}`, 10, 80)
				//this.velocity = Vector.dot(this.velocity, tangent) * tangent
				//other.velocity = Vector.dot(other.velocity, tangent) * tangent*/
			}
			else {
				// Just move
				this.center = Vector.add(this.center, Vector.mul(this.velocity, dt))
				other.center = Vector.add(other.center, Vector.mul(other.velocity, dt))
			}
		}
	}
	/**
	 * Returns true if the given point is contained by the shape
	 * @param {Vector} p The point to check for containment
	 * @returns {boolean} True if the given point is contained by the shape
	 */
	contains(p) {
		throw "implement contains"
	}
	/**
	 * Returns the point on the shape which is closest to the given point
	 * @param {Vector} p The point to find the closest point for
	 * @returns {Vector} The point on the shape which is closest to the given point
	 */
	closestPoint(p) {
		throw "implement closestPoint"
	}
	/**
	 * Returns the t of the closest intersection point between the segment and the shape
	 * @param {Vector} origin The origin of the segment
	 * @param {Vector} direction The direction and length of the segment
	 * @returns {number} The t of the closest intersection point between the segment and the shape
	 */
	rayCast(origin, direction) {
		throw "implement rayCast"
	}
	/**
	 * Returns the Minkowski sum of the two shapes
	 * @param {Shape} other The shape to add to this one
	 * @returns {Shape} The Minkowski sum of the two shapes
	 */
	sum(other) {
		throw "implement sum"
	}
}

class Circle extends Shape {
	constructor(center, radius) {
		super(center)
		this.radius = radius
	}

	draw() {
		ctx.beginPath();
		ctx.arc(this.center.x + 0.5, this.center.y + 0.5, this.radius, 0, 2 * Math.PI);
		ctx.stroke();
	}

	contains(p) {
		return Vector.sub(p, this.center).length < this.radius
	}

	closestPoint(p) {
		let v = Vector.sub(p, this.center)
		return Vector.add(this.center, Vector.mul(v, this.radius / v.length))
	}

	rayCast(origin, direction) {
		return rayCastCircle(origin, direction, this.center, this.radius)
	}

	sum(other) {
		if (other instanceof Circle) {
			// The Minkowski sum of a circle and another circle is a circle
			return new Circle(Vector.sub(this.center, other.center), this.radius + other.radius)
		}
		else if (other instanceof AABB) {
			// The Minkowski sum of a circle and a box is a rounded rectangle
			return new RoundRect(Vector.sub(this.center, other.center), 
											this.radius + other.hw, 
											this.radius + other.hh,
											this.radius)
		}
		else if (other instanceof RoundRect) {
			// The Minkowski sum of a circle and a rounded rectangle is a rounded rectangle
			return new RoundRect(Vector.sub(this.center, other.center),
											this.radius + other.hw, 
											this.radius + other.hh,
											this.radius + other.radius)
		}
		else {
			throw `sum is not implemented for ${this.constructor.name} and ${other.constructor.name}`
		}
	}
}

class RoundRect extends Shape {
	constructor(center, hw, hh, radius) {
		super(center)
		this.hw = hw
		this.hh = hh
		this.radius = radius
		this.velocity = Vector.ZERO.clone()
	}

	get left() {
		return this.center.x - this.hw
	}

	get top() {
		return this.center.y - this.hh
	}

	get right() {
		return this.center.x + this.hw
	}

	get bottom() {
		return this.center.y + this.hh
	}

	draw() {
		ctx.beginPath()
		ctx.moveTo(this.left + this.radius + 0.5, this.top + 0.5)
		ctx.lineTo(this.right - this.radius + 0.5, this.top + 0.5)
		ctx.quadraticCurveTo(this.right, this.top, this.right + 0.5, this.top + this.radius + 0.5)
		ctx.lineTo(this.right + 0.5, this.bottom - this.radius + 0.5)
		ctx.quadraticCurveTo(this.right, this.bottom, this.right - this.radius + 0.5, this.bottom + 0.5)
		ctx.lineTo(this.left + this.radius + 0.5, this.bottom + 0.5)
		ctx.quadraticCurveTo(this.left, this.bottom, this.left + 0.5, this.bottom - this.radius + 0.5)
		ctx.lineTo(this.left + 0.5, this.top + this.radius + 0.5)
		ctx.quadraticCurveTo(this.left, this.top, this.left + this.radius + 0.5, this.top + 0.5)
		ctx.stroke()
	}

	contains(p) {
		// Look from the standpoint of a rounded rectangle with its center at the origin
		p = Vector.sub(p, this.center)
		// Use abs to make use of symmetry then subtract the size of the rectangle without the
		// round corners. For a point inside this rectangle, q is negative
		let q = Vector.add(Vector.abs(p), new Vector(-this.hw + this.radius, -this.hh + this.radius))
		// The second term is negative if the distance is smaller than the radius
		let t = Math.min(Math.max(q.x, q.y) ,0) + Vector.max(q, Vector.ZERO).length - this.radius
		return t <= 0
	}

	closestPoint(p) {
		// Look from the standpoint of a rounded rectangle with its center at the origin
		let v = Vector.sub(p, this.center)
		// Make use of symmetry and only evaluate one quadrant
		let q = Vector.abs(v)
		let minDist = Number.POSITIVE_INFINITY
		let c = p.clone()
		// Discriminate between points in the circle sub-quadrant and three rectangle quadrants
		let r = new Vector(this.hw - this.radius, this.hh - this.radius)
		if (q.x > r.x && q.y > r.y) {
			// Circle with center r
			let w = Vector.sub(q, r)
			w = Vector.add(r, Vector.mul(w, this.radius / w.length))
			// Re-center and place into original quadrant
			c.x = this.center.x + (v.x > 0 ? w.x : -w.x)
			c.y = this.center.y + (v.y > 0 ? w.y : -w.y)
		}
		else {
			// Rectangle
			if (q.x <= r.x) {
				minDist = Math.abs(q.x - this.hh)
				c.x = p.x
				c.y = v.y > 0 ? this.bottom : this.top
			}
			if (q.y < r.y && Math.abs(q.y - this.hw) < minDist) {
				minDist = Math.abs(q.y - this.hh)
				c.y = p.y
				c.x = v.x > 0 ? this.right : this.left
			}
		}
		return c
	}

	rayCast(origin, direction) {
		let end = Vector.add(origin, direction)
    	let minT = rayCastEdge(origin, end, 
							   new Vector(this.left, this.top + this.radius),
							   new Vector(this.left, this.bottom - this.radius))
    	let t = rayCastEdge(origin, end, 
							   new Vector(this.left + this.radius, this.bottom),
							   new Vector(this.right - this.radius, this.bottom))
    	if (t < minT) { minT = t }
    	t = rayCastEdge(origin, end, 
							   new Vector(this.right, this.top + this.radius),
							   new Vector(this.right, this.bottom - this.radius))
    	if (t < minT) { minT = t }
    	t = rayCastEdge(origin, end, 
							   new Vector(this.left + this.radius, this.top),
							   new Vector(this.right - this.radius, this.top))
    	if (t < minT) { minT = t }
		t = rayCastCircle(origin, direction, new Vector(this.left + this.radius, this.top + this.radius), this.radius)
		if (t < minT) { minT = t }
		t = rayCastCircle(origin, direction, new Vector(this.right - this.radius, this.top + this.radius), this.radius)
		if (t < minT) { minT = t }
		t = rayCastCircle(origin, direction, new Vector(this.right - this.radius, this.bottom - this.radius), this.radius)
		if (t < minT) { minT = t }
		t = rayCastCircle(origin, direction, new Vector(this.left + this.radius, this.bottom - this.radius), this.radius)
		if (t < minT) { minT = t }
		ctx.fillText(`${t}`, 10, 50)
    	return minT
	}

	sum(other) {
		if (other instanceof AABB) {
			// The Minkowski sum of a rounded rectangle and a box is a rounded rectangle
			return new RoundRect(Vector.sub(this.center, other.center), 
											this.hw + other.hw, 
											this.hh + other.hh,
											this.radius)
		}
		else if (other instanceof Circle) {
			// The Minkowski sum of a rounded rectangle and a circle is a rounded rectangle
			return new RoundRect(Vector.sub(this.center, other.center),
											this.hw + other.radius, 
											this.hh + other.radius,
											this.radius + other.radius)
		}
		else {
			throw `sum is not implemented for ${this.constructor.name} and ${other.constructor.name}`
		}
	}
}

class AABB extends Shape {
	constructor(center, hw, hh) {
		super(center)
		this.hw = hw
		this.hh = hh
		this.velocity = Vector.ZERO.clone()
	}

	get left() {
		return this.center.x - this.hw
	}

	get leftTop() {
		return new Vector(this.left, this.top)
	}

	get leftBottom() {
		return new Vector(this.left, this.bottom)
	}

	get top() {
		return this.center.y - this.hh
	}

	get right() {
		return this.center.x + this.hw
	}

	get rightTop() {
		return new Vector(this.right, this.top)
	}

	get rightBottom() {
		return new Vector(this.right, this.bottom)
	}

	get bottom() {
		return this.center.y + this.hh
	}

	get width() {
		return this.hw * 2
	}

	get height() {
		return this.hh * 2
	}

	draw() {
		ctx.beginPath()
		ctx.rect(this.left + .5, this.top + .5, this.width, this.height)
		ctx.stroke()
	}

	contains(p) {
		return this.left <= p.x && this.right >= p.x && this.top <= p.y && this.bottom >= p.y
	}

	closestPoint(p) {
		let minDist = Math.abs(p.x - this.left)
		let x = this.left
		let y = p.y
		if (Math.abs(this.right - p.x) < minDist) {
			minDist = Math.abs(this.right - p.x);
			x = this.right
		}
		if (Math.abs(this.bottom - p.y) < minDist) {
			minDist = Math.abs(this.bottom - p.y);
			x = p.x
			y = this.bottom
		}
		if (Math.abs(this.top - p.y) < minDist) {
			x = p.x
			minDist = Math.abs(this.top - p.y);
			y = this.top
		}
		return new Vector(x, y)
	}

	rayCast(origin, direction) {
    	let end = Vector.add(origin, direction)
    	let minT = rayCastEdge(origin, end, this.leftTop, this.leftBottom)
    	let t = rayCastEdge(origin, end, this.leftBottom, this.rightBottom)
    	if (t < minT) { minT = t }
    	t = rayCastEdge(origin, end, this.rightBottom, this.rightTop)
    	if (t < minT) { minT = t }
    	t = rayCastEdge(origin, end, this.rightTop, this.leftTop)
    	if (t < minT) { minT = t }
    	return minT
	}

	sum(other) {
		if (other instanceof AABB) {
			// The Minkowski sum of a box and another box is a box
			return new AABB(Vector.sub(this.center, other.center), 
							this.hw + other.hw, 
							this.hh + other.hh)
		}
		else if (other instanceof Circle) {
			// The Minkowski sum of a box and a circle is a rounded rectangle
			return new RoundRect(Vector.sub(this.center, other.center), 
											other.radius + this.hw, 
											other.radius + this.hh,
											other.radius)
		}
		else if (other instanceof RoundRect) {
			// The Minkowski sum of a box and a rounded rectangle is a rounded rectangle
			return new RoundRect(Vector.sub(this.center, other.center), 
											this.hw + other.hw, 
											this.hh + other.hh,
											other.radius)
		}
		else {
			throw `sum is not implemented for ${this.constructor.name} and ${other.constructor.name}`
		}
	}
}

//let a = new AABB(new Vector(200, 200), 50, 50)
//let b = new AABB(new Vector(250, 250), 50, 50)
//let a = new Circle(new Vector(200, 200), 50)
let b = new Circle(new Vector(250, 250), 50)
let a = new RoundRect(new Vector(200, 200), 50, 50, 20)
//let c = a.sum(b)
//console.log(c, a.intersects(b))

let down = false
let p = {x:0, y:0}
canvas.addEventListener("mousedown", event => {
	let rect = canvas.getBoundingClientRect()
    p.x = Math.round(event.clientX - rect.left)
    p.y = Math.round(event.clientY - rect.top)
	a.setLinearVelocity(Vector.ZERO)
	down = true
});

canvas.addEventListener("mouseup", event => {
	let d = a.intersect(b)
	if (d) {
		a.center = Vector.sub(a.center, d)
	}
	else {
		a.setLinearVelocity(new Vector(0, 10))
	}
	down = false
});

canvas.addEventListener("mousemove", event => {
	if (down) {
		let rect = canvas.getBoundingClientRect()
		let _x = Math.round(event.clientX - rect.left)
		let _y = Math.round(event.clientY - rect.top)
		a.center = Vector.add(a.center, new Vector(_x - p.x, _y - p.y))
		p.x = _x
		p.y = _y
	}
});

function animate() {
  	try {
		ctx.clearRect(0, 0, 640, 480)
		//a.update(0.33)
		a.solveCollisions(b, 0.33)
		a.draw()
		b.draw()
		let c = a.sum(b)
		c.draw()
		let po = c.closestPoint(Vector.ZERO)
		ctx.fillRect(po.x-2, po.y-2, 4, 4)
		ctx.fillText(`${p.x}, ${p.y} ${a.contains(new Vector(p.x, p.y))}`, 10, 90)
		ctx.fillText(`${a.rayCast(new Vector(p.x, p.y), new Vector(0, 10))}`, 10, 130)
		requestAnimationFrame(animate)
	}
	catch (e) {
		console.error(e)
	}
}

animate()
