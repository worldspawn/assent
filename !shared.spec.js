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
      })
    });

    addressValidator.applyTo(Address);
    return Address;
  }

  function userConstructorFactory (Validator, Address) {
    function UserCreate() {
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
          .withMessage('firstName cannot be shorter than {|}')
        f.maxLength(20)
          .withMessage('firstName cannot be longer than {|}')
      });

      c.ruleFor('lastName', function (f) {
        f.notEmpty()
          .withMessage('lastName is required');
      });

      c.ruleFor('age', function (f) {
        f.min(18)
          .withMessage('user must be at least {|}');
        f.max(80)
          .withMessage('user must be less than {|}')
        f.notEmpty()
          .when(function (obj) { return obj.dob === null ;});
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
          .withMessage('you must provide at least one tag')
          .validateCollection();
      });

      c.ruleFor('categories', function (f) {
        f.notEmpty()
          .withMessage('category cannot be blank');
      });
    });

    userValidator.applyTo(UserCreate);
    return UserCreate;
  }

  // beforeEach(function () {
  //   var m = angular.module('validation');
  //   m.factory('UserCreate', userConstructorFactory);
  //   m.factory('Address', addressConstructorFactory);
  // });

  return {
    addressConstructorFactory: addressConstructorFactory,
    userConstructorFactory: userConstructorFactory
  };
}
