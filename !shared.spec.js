function createResources() {
  'use strict';

  function addressConstructorFactory (Validator) {
    function Address() {
      this.line1 = null;
      this.postCode = null;
    }

    var addressValidator = new Validator(function (c) {
      c.ruleFor('line1', function (f) {
        f.notEmpty()
          .withMessage('line1 is required');
      });
    });

    addressValidator.applyTo(Address);
    return Address;
  }

  function userConstructorFactory (Validator, Address) {
    function UserCreate() {
      this.email = null;
      this.username = null;
      this.firstName = null;
      this.lastName = null;
      this.age = null;
      this.dob = null;
      this.password = null;
      this.passwordConfirmation = null;
      this.address = new Address();
      this.tags = [];
      this.categories = [];
      this.notes = null;
    }

    var userValidator = new Validator(function (c) {
      c.ruleFor('username', function (f) {
        f.notEmpty()
          .withMessage('username is required');
      });

      c.ruleFor('firstName', function (f) {
        f.notEmpty()
          .withMessage('firstName is required');
        f.minLength(10)
          .withMessage('firstName cannot be shorter than {|}');
        f.maxLength(20)
          .withMessage('firstName cannot be longer than {|}');
      });

      c.ruleFor('lastName', function (f) {
        f.notEmpty()
          .withMessage('lastName is required');
      });

      c.ruleFor('age', function (f) {
        f.min(18)
          .withMessage('user must be at least {|}');
        f.max(80)
          .withMessage('user must be less than {|}');
        f.notEmpty()
          .when(function (obj) { return obj.dob === null ;});
      });

      c.ruleFor('dob', function (f) {
        f.min(new Date(Date.parse('1950-01-01T00:00:00.00Z')))
          .withMessage('User must be born after or on 1950');
        f.max(new Date(Date.parse('2000-01-01T00:00:00.00Z')))
            .withMessage('User must be born before or on 2000');
      });

      c.ruleFor('email', function (f) {
        f.email()
          .withMessage('not a valid email');
      });

      c.ruleFor('password', function (f) {
        f.notEmpty()
          .withMessage('password is required');
      });

      c.ruleFor('passwordConfirmation', function (f) {
        f.notEmpty()
          .withMessage('password confirmation is required');

        f.matches(function (obj) { return obj.password; })
          .withMessage('password confirmation must match password');
      });

      c.ruleFor('tags', function (f) {
        f.notEmpty()
          .withMessage('you must provide at least one tag');
      });

      c.ruleFor('categories', function (f) {
        f.notEmpty()
          .withMessage('category cannot be blank')
          .validateCollection();
      });

      c.ruleFor('notes', function (f) {
        f.regex(/test/, 'value')
          .withMessage('Notes must contain the word \'test\'');
      });
    });

    userValidator.applyTo(UserCreate);
    return UserCreate;
  }

  return {
    addressConstructorFactory: addressConstructorFactory,
    userConstructorFactory: userConstructorFactory
  };
}
