# Assent

This is inspired heavily by the c# [Fluent Validation](https://github.com/JeremySkinner/FluentValidation) library.

## Install

`bower install assent`

## Usage

### Defining models and their validators

``` js
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
```

`addressValidator.applyTo(Address);` sets the validator to `Address`'s prototype.

``` js
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
      .withMessage('you must provide at least one tag');
  });

  c.ruleFor('categories', function (f) {
    f.notEmpty()
      .withMessage('category cannot be blank')
      .validateCollection();
  });
});

userValidator.applyTo(UserCreate);
```

### Validating and instance of your model

``` js
var user = new UserCreate();
var result = user.$validate();
```

### Format of the validation result object

#### For Fields

`result.firstName.notEmpty.error` (true|false)
`result.firstName.notEmpty.message` set on error

###### For Arrays using foreach validation

This is for when `validationCollection` is not called, it will validate each element in the array rather than the array itself. The default behaviour is to validate the array.

`result.firstName.notEmpty.error` (true|false)
`result.firstName.notEmpty[0].error` (true|false)
`result.firstName.notEmpty[0].message` (error message if applicable)

## Integration

[Angular](https://github.com/worldspawn/angular-assent)

### TODO
- [ ] recursive validation
- [ ] support returning promises from rule function
- [ ] and perhaps some promise support for messages
- [ ] and what the hey, promises for the when calls too! Promises! Promises!
- [ ] message interpolation feels a bit wonky with the msgVars and the msgArgs. msgVars are extra args to pass to msgArs that are then interpolated into the message string.
