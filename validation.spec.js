(function () {
  'use strict';

  describe('validation', function () {
    beforeEach(module('validation'));

    it ('should inject ValidatorRuleComponent', inject(function (ValidatorRuleComponent) {
      expect(ValidatorRuleComponent instanceof Function).toBe(true);
    }));

    it ('should inject ValidatorRule', inject(function (ValidatorRule) {
      expect(ValidatorRule instanceof Function).toBe(true);
    }));

    it ('should inject Validator', inject(function (Validator) {
      expect(Validator instanceof Function).toBe(true);
    }));

    describe('for a model', function () {
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

      beforeEach(function () {
        var m = angular.module('validation');
        m.factory('UserCreate', userConstructorFactory);
        m.factory('Address', addressConstructorFactory);
      });

      describe('for a form', function () {
        it('should indicate username notEmpty has failed validation then pass after a value is entered', inject(function ($controller, $compile, $rootScope, UserCreate) {
          var user = new UserCreate();
          var html = '<form name="form" novalidate><input type="text" name="username" ng-model="user.username" validation-target /></form>';
          var form = angular.element(html);
          var scope = $rootScope.$new();
          scope.user = user;
          form = $compile(form)(scope);

          scope.$digest();
          expect(scope.form.username.$error.notEmpty).toBe(true);
          user.username = 'username';
          scope.$digest();
          expect(scope.form.username.$error.notEmpty).toBeUndefined();
        }));

        describe('for nested model validation', function () {
          it('should indicate line of the users address has failed then pass after a value is entered', inject(function ($controller, $compile, $rootScope, UserCreate) {
            var user = new UserCreate();
            var html = '<form name="form" novalidate><input type="text" name="username" ng-model="user.username" validation-target /><input type="text" name="address.line1" ng-model="user.address.line1" validation-target /></form>';
            var form = angular.element(html);
            var scope = $rootScope.$new();
            scope.user = user;
            form = $compile(form)(scope);

            scope.$digest();

            expect(scope.form['address.line1'].$error.notEmpty).toBe(true);
            user.address.line1 = 'line1';
            scope.$digest();
            expect(scope.form['address.line1'].$error.notEmpty).toBeUndefined();
          }));
        });
      });

      describe('collection validation', function () {
        describe('where entire collection is validated as one', function () {
          it ('should fail when tags is an empty array', inject(function (UserCreate) {
            var user = new UserCreate();
            var result = user.$$validator.validate(user);

            expect(result).not.toBeUndefined();
            expect(result.tags.notEmpty.$error).toBe(true);
          }));

          it ('should pass when tags array contains an item', inject(function (UserCreate) {
            var user = new UserCreate();
            user.tags.push('test');
            var result = user.$$validator.validate(user);

            expect(result).not.toBeUndefined();
            expect(result.tags.notEmpty.$error).toBe(false);
          }));
        });

        describe('where each collection item is validated', function () {
          it ('should pass when categories array is empty', inject(function (UserCreate) {
            var user = new UserCreate();
            var result = user.$$validator.validate(user);

            expect(result).not.toBeUndefined();
            expect(result.categories.notEmpty.$error).toBe(false);
          }));

          it ('should fail when categories array contains a blank item', inject(function (UserCreate) {
            var user = new UserCreate();
            user.categories.push('');
            var result = user.$$validator.validate(user);

            expect(result).not.toBeUndefined();
            expect(result.categories.notEmpty.$error).toBe(true);
          }));

          it ('should pass when categories array contains a non-blank item', inject(function (UserCreate) {
            var user = new UserCreate();
            user.categories.push('test');
            var result = user.$$validator.validate(user);

            expect(result).not.toBeUndefined();
            expect(result.categories.notEmpty.$error).toBe(false);
          }));

          it ('should fail when categories array contains a non-blank item and a blank item and first item fails and second item passes', inject(function (UserCreate) {
            var user = new UserCreate();
            user.categories.push('');
            user.categories.push('test');
            var result = user.$$validator.validate(user);

            expect(result).not.toBeUndefined();
            expect(result.categories.notEmpty.$error).toBe(true);
            expect(result.categories.notEmpty[0]).toBe('category cannot be blank');
            expect(result.categories.notEmpty[1]).toBe(false);
          }));
        });
      });

      describe('validator constraints', function () {
        it ('should fail age validation when dob is null and age is null', inject(function(UserCreate) {
          var user = new UserCreate();
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.age.notEmpty.$error).toBe(true);
        }));

        it ('should pass age validation when dob is not null but age is null', inject(function(UserCreate) {
          var user = new UserCreate();
          user.dob = new Date();
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.age.notEmpty.$error).toBe(false);
        }));
      });

      describe('empty validation', function () {
        it ('should fail when username is empty', inject(function (UserCreate) {
          var user = new UserCreate();
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.username.notEmpty.$error).toBe(true);
        }));

        it ('should pass when username is not empty', inject(function (UserCreate) {
          var user = new UserCreate();
          user.username = 'testuser';
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.username.notEmpty.$error).toBe(false);
        }));

        it ('should return the correct error message on fail', inject(function (UserCreate) {
          var user = new UserCreate();
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.username.notEmpty.message).toBe('username is required');
        }));
      });

      describe ('maxLength validation', function () {
        it ('should pass when firstName length is less than 20', inject(function (UserCreate) {
          var user = new UserCreate();
          user.firstName = 'test';
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.firstName.maxLength.$error).toBe(false);
        }));

        it ('should fail when firstName length is greater than 20', inject(function (UserCreate) {
          var user = new UserCreate();
          user.firstName = 'test test test test test test ';
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.firstName.maxLength.$error).toBe(true);
          expect(result.firstName.maxLength.message).toBe('firstName cannot be longer than 20');
        }));
      });

      describe ('minLength validation', function () {
        it ('should pass when firstName length is equal to 10', inject(function (UserCreate) {
          var user = new UserCreate();
          user.firstName = 'test test ';
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.firstName.minLength.$error).toBe(false);
        }));

        it ('should pass when firstName length is less than 10', inject(function (UserCreate) {
          var user = new UserCreate();
          user.firstName = 'test';
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.firstName.minLength.$error).toBe(true);
          expect(result.firstName.minLength.message).toBe('firstName cannot be shorter than 10');
        }));
      });

      describe ('matches validation', function () {
        it ('should pass when passwordConfirmation is null', inject(function (UserCreate) {
          var user = new UserCreate();
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.passwordConfirmation.matches.$error).toBe(false);
        }));

        it ('should pass when passwordConfirmation is matches password', inject(function (UserCreate) {
          var user = new UserCreate();
          user.password = 'password';
          user.passwordConfirmation = 'password';
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.passwordConfirmation.matches.$error).toBe(false);
        }));

        it ('should fail when passwordConfirmation does not match password', inject(function (UserCreate) {
          var user = new UserCreate();
          user.password = 'password';
          user.passwordConfirmation = 'pass--word';
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.passwordConfirmation.matches.$error).toBe(true);
        }));

        it ('should fail with correct message', inject(function (UserCreate) {
          var user = new UserCreate();
          user.password = 'password';
          user.passwordConfirmation = 'pass--word';
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.passwordConfirmation.matches.message).toBe('password confirmation must match password');
        }));

        it ('should pass when compared with a constant that matches', inject(function (UserCreate) {
          UserCreate.prototype.$$validator.ruleFor('passwordConfirmation', function (f) {
            f.notEmpty()
              .withMessage('password confirmation is required');

            f.matches('password')
              .withMessage('password confirmation must match password');
          });

          var user = new UserCreate();
          user.passwordConfirmation = 'password';
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.passwordConfirmation.matches.$error).toBe(false);
        }));

        it ('should fail when compared with a constant that does not match', inject(function (UserCreate) {
          UserCreate.prototype.$$validator.ruleFor('passwordConfirmation', function (f) {
            f.notEmpty()
              .withMessage('password confirmation is required');

            f.matches('password')
              .withMessage('password confirmation must match password');
          });

          var user = new UserCreate();
          user.passwordConfirmation = 'pass--word';
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.passwordConfirmation.matches.$error).toBe(true);
        }));
      });

      describe ('min validation', function () {
        it ('should not fail age min validation when age is null', inject(function (UserCreate) {
          var user = new UserCreate();
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.age.min.$error).toBe(false);
        }));

        it ('should fail age min validation when age is below 18', inject(function (UserCreate) {
          var user = new UserCreate();
          user.age = 15;
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.age.min.$error).toBe(true);
          expect(result.age.min.message).toBe('user must be at least 18');
        }));

        it ('should pass age min validation when age is above 18', inject(function (UserCreate) {
          var user = new UserCreate();
          user.age = 20;
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.age.min.$error).toBe(false);
        }));
      });

      describe ('max validation', function () {
        it ('should not fail age max validation when age is null', inject(function (UserCreate) {
          var user = new UserCreate();
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.age.max.$error).toBe(false);
        }));

        it ('should fail age max validation when age is above 80', inject(function (UserCreate) {
          var user = new UserCreate();
          user.age = 85;
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.age.max.$error).toBe(true);
          expect(result.age.max.message).toBe('user must be less than 80');
        }));

        it ('should pass age min validation when age is below 80', inject(function (UserCreate) {
          var user = new UserCreate();
          user.age = 20;
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.age.max.$error).toBe(false);
        }));
      });
    });
  });
})();
