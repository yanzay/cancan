'use strict';

const test = require('ava');
const CanCan = require('./');

class Model {
	constructor(attrs = {}) {
		this.attrs = attrs;
	}

	get(key) {
		return this.attrs[key];
	}
}

class User extends Model {}
class Product extends Model {}

test('allow one action', t => {
	const cancan = new CanCan();
	const {can, allow, cannot} = cancan;

	allow(User, 'read', Product);

	const user = new User();
	const product = new Product();

	t.true(can(user, 'read', product));
	t.false(cannot(user, 'read', product));
	t.false(can(user, 'create', product));
});

test('allow many actions', t => {
	const cancan = new CanCan();
	const {can, allow} = cancan;

	allow(User, ['read', 'create', 'destroy'], Product);

	const user = new User();
	const product = new Product();

	t.true(can(user, 'read', product));
	t.true(can(user, 'create', product));
	t.true(can(user, 'destroy', product));
});

test('allow all actions using "manage"', t => {
	const cancan = new CanCan();
	const {can, allow} = cancan;

	allow(User, 'manage', Product);

	const user = new User();
	const product = new Product();

	t.true(can(user, 'read', product));
	t.true(can(user, 'create', product));
	t.true(can(user, 'update', product));
	t.true(can(user, 'destroy', product));
	t.true(can(user, 'modify', product));
});

test('allow all actions and all objects', t => {
	const cancan = new CanCan();
	const {can, allow} = cancan;

	allow(User, 'manage', 'all');

	const user = new User();
	const product = new Product();

	t.true(can(user, 'read', user));
	t.true(can(user, 'read', product));
});

test('allow only objects that satisfy given condition', t => {
	const cancan = new CanCan();
	const {can, allow} = cancan;

	allow(User, 'read', Product, {published: true});

	const user = new User();
	const privateProduct = new Product();
	const publicProduct = new Product({published: true});

	t.false(can(user, 'read', privateProduct));
	t.true(can(user, 'read', publicProduct));
});

test('allow only when performer passes a condition', t => {
	const cancan = new CanCan();
	const {can, allow} = cancan;

	allow(User, 'read', Product, user => user.get('admin'));

	const user = new User();
	const adminUser = new User({admin: true});
	const product = new Product();

	t.false(can(user, 'read', product));
	t.true(can(adminUser, 'read', product));
});

test('allow only when target passes a condition', t => {
	const cancan = new CanCan();
	const {can, allow} = cancan;

	allow(User, 'read', Product, (user, product) => product.get('published'));

	const user = new User();
	const privateProduct = new Product();
	const publicProduct = new Product({published: true});

	t.false(can(user, 'read', privateProduct));
	t.true(can(user, 'read', publicProduct));
});

test('allow permissions on classes', t => {
	const cancan = new CanCan();
	const {can, allow} = cancan;

	allow(User, 'read', Product);

	const user = new User();

	t.true(can(user, 'read', Product));
});

test('throw if permission is not granted', t => {
	const cancan = new CanCan();
	const {allow, authorize} = cancan;

	allow(User, 'read', Product, (user, product) => product.get('published'));

	const user = new User();
	const privateProduct = new Product();
	const publicProduct = new Product({published: true});

	authorize(user, 'read', publicProduct);

	t.throws(function () {
		authorize(user, 'read', privateProduct);
	}, Error, 'Authorization error.');
});

test('throw a custom error if permission is not granted', t => {
	class AuthError {
		constructor(message) {
			this.message = message;
		}
	}

	const cancan = new CanCan({
		createError(performer, action) {
			return new AuthError(`User couldn't ${action} product.`);
		}
	});

	const {allow, authorize} = cancan;

	allow(User, 'read', Product, (user, product) => product.get('published'));

	const user = new User();
	const privateProduct = new Product();
	const publicProduct = new Product({published: true});

	authorize(user, 'read', publicProduct);

	t.throws(function () {
		authorize(user, 'read', privateProduct);
	}, AuthError, 'User couldn\'t read product.');
});

test('override instanceOf', t => {
	const cancan = new CanCan({
		instanceOf(instance, model) {
			return instance instanceof model.Instance;
		}
	});

	const {allow, can, cannot} = cancan;

	// mimic Sequelize models
	allow({Instance: User}, 'read', {Instance: Product});

	const user = new User();
	const product = new Product();

	t.true(can(user, 'read', product));
	t.false(cannot(user, 'read', product));
	t.false(can(user, 'create', product));
});
