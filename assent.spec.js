(function () {
  'use strict';

  describe('validation', function () {
    describe('for a model', function () {
      var UserCreate, Address;
      var resources = createResources();

      beforeEach(function () {
        //not using this in this spec... validator probably needs a way to recursively validate its fields if they have their own validator
        Address = resources.addressConstructorFactory(validation.Validator);
        UserCreate = resources.userConstructorFactory(validation.Validator, Address);
      });

      describe('collection validation', function () {
        describe('where entire collection is validated as one', function () {
          it ('should fail when tags is an empty array', function () {
            var user = new UserCreate();
            var result = user.$validate(user);

            expect(result).not.toBeUndefined();
            expect(result.tags.notEmpty.error).toBe(true);
          });

          it ('should pass when tags array contains an item', function () {
            var user = new UserCreate();
            user.tags.push('test');
            var result = user.$validate(user);

            expect(result).not.toBeUndefined();
            expect(result.tags.notEmpty.error).toBe(false);
          });
        });

        describe('where each collection item is validated', function () {
          it ('should pass when categories array is empty', function () {
            var user = new UserCreate();
            var result = user.$validate();

            expect(result).not.toBeUndefined();
            expect(result.categories.notEmpty.error).toBe(false);
          });

          it ('should fail when categories array contains a blank item', function () {
            var user = new UserCreate();
            user.categories.push('');
            var result = user.$validate();

            expect(result).not.toBeUndefined();
            expect(result.categories.notEmpty.error).toBe(true);
          });

          it ('should pass when categories array contains a non-blank item', function () {
            var user = new UserCreate();
            user.categories.push('test');
            var result = user.$validate();

            expect(result).not.toBeUndefined();
            expect(result.categories.notEmpty.error).toBe(false);
          });

          it ('should fail when categories array contains a non-blank item and a blank item and first item fails and second item passes', function () {
            var user = new UserCreate();
            user.categories.push('');
            user.categories.push('test');
            var result = user.$validate();

            expect(result).not.toBeUndefined();
            expect(result.categories.notEmpty.error).toBe(true);
            expect(result.categories.notEmpty[0]).toEqual({ message: 'category cannot be blank', error: true});
            expect(result.categories.notEmpty[1]).toEqual({ error: false });
          });
        });
      });

      describe('validator constraints', function () {
        it ('should fail age validation when dob is null and age is null', function () {
          var user = new UserCreate();
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.age.notEmpty.error).toBe(true);
        });

        it ('should pass age validation when dob is not null but age is null', function () {
          var user = new UserCreate();
          user.dob = new Date();
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.age.notEmpty.error).toBe(false);
        });
      });

      describe('empty validation', function () {
        it ('should fail when username is empty', function () {
          var user = new UserCreate();
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.username.notEmpty.error).toBe(true);
        });

        it ('should pass when username is not empty', function () {
          var user = new UserCreate();
          user.username = 'testuser';
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.username.notEmpty.error).toBe(false);
        });

        it ('should return the correct error message on fail', function () {
          var user = new UserCreate();
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.username.notEmpty.message).toBe('username is required');
        });
      });

      describe ('maxLength validation', function () {
        it ('should pass when firstName length is less than 20', function () {
          var user = new UserCreate();
          user.firstName = 'test';
          var result = user.$$validator.validate(user);

          expect(result).not.toBeUndefined();
          expect(result.firstName.maxLength.error).toBe(false);
        });

        it ('should fail when firstName length is greater than 20', function () {
          var user = new UserCreate();
          user.firstName = 'test test test test test test ';
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.firstName.maxLength.error).toBe(true);
          expect(result.firstName.maxLength.message).toBe('firstName cannot be longer than 20');
        });
      });

      describe ('minLength validation', function () {
        it ('should pass when firstName length is equal to 10', function () {
          var user = new UserCreate();
          user.firstName = 'test test ';
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.firstName.minLength.error).toBe(false);
        });

        it ('should pass when firstName length is less than 10', function () {
          var user = new UserCreate();
          user.firstName = 'test';
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.firstName.minLength.error).toBe(true);
          expect(result.firstName.minLength.message).toBe('firstName cannot be shorter than 10');
        });
      });

      describe ('matches validation', function () {
        it ('should pass when passwordConfirmation is null', function () {
          var user = new UserCreate();
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.passwordConfirmation.matches.error).toBe(false);
        });

        it ('should pass when passwordConfirmation is matches password', function () {
          var user = new UserCreate();
          user.password = 'password';
          user.passwordConfirmation = 'password';
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.passwordConfirmation.matches.error).toBe(false);
        });

        it ('should fail when passwordConfirmation does not match password', function () {
          var user = new UserCreate();
          user.password = 'password';
          user.passwordConfirmation = 'pass--word';
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.passwordConfirmation.matches.error).toBe(true);
        });

        it ('should fail with correct message', function () {
          var user = new UserCreate();
          user.password = 'password';
          user.passwordConfirmation = 'pass--word';
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.passwordConfirmation.matches.message).toBe('password confirmation must match password');
        });

        it ('should pass when compared with a constant that matches', function () {
          var UC = resources.userConstructorFactory(validation.Validator, Address)
          UC.prototype.$$validator.ruleFor('passwordConfirmation', function (f) {
            f.matches('password')
              .withMessage('password confirmation must match password');
          });

          var user = new UC();
          user.passwordConfirmation = 'password';
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.passwordConfirmation.matches.error).toBe(false);
        });

        it ('should fail when compared with a constant that does not match', function () {
          var UC = resources.userConstructorFactory(validation.Validator, Address)
          UC.prototype.$$validator.ruleFor('passwordConfirmation', function (f) {
            f.matches('password')
              .withMessage('password confirmation must match password');
          });

          var user = new UC();
          user.passwordConfirmation = 'pass--word';
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.passwordConfirmation.matches.error).toBe(true);
        });
      });

      describe ('min validation', function () {
        it ('should not fail age min validation when age is null', function () {
          var user = new UserCreate();
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.age.min.error).toBe(false);
        });

        it ('should fail age min validation when age is below 18', function () {
          var user = new UserCreate();
          user.age = 15;
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.age.min.error).toBe(true);
          expect(result.age.min.message).toBe('user must be at least 18');
        });

        it ('should pass age min validation when age is above 18', function () {
          var user = new UserCreate();
          user.age = 20;
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.age.min.error).toBe(false);
        });
      });

      describe ('max validation', function () {
        it ('should not fail age max validation when age is null', function () {
          var user = new UserCreate();
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.age.max.error).toBe(false);
        });

        it ('should fail age max validation when age is above 80', function () {
          var user = new UserCreate();
          user.age = 85;
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.age.max.error).toBe(true);
          expect(result.age.max.message).toBe('user must be less than 80');
        });

        it ('should pass age min validation when age is below 80', function () {
          var user = new UserCreate();
          user.age = 20;
          var result = user.$validate();

          expect(result).not.toBeUndefined();
          expect(result.age.max.error).toBe(false);
        });
      });
    });
  });
})();
